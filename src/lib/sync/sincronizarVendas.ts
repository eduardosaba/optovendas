import { db } from "@/lib/dexie-db";

type SyncOptions = {
  // função que retorna o header Authorization, por exemplo: () => `Bearer ${token}`
  getAuthHeader?: () => Promise<string | null>;
  // se fornecido, usado como fallback para chamadas em contextos onde o token do browser não está disponível
  internalKeyHeaderName?: string; // ex: 'x-internal-key'
  internalKey?: string;
  endpoint?: string; // endpoint para enviar as vendas
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (info: { total: number; processed: number; success: number; failed: number }) => void;
};

export async function sincronizarVendas(opts: SyncOptions = {}) {
  const {
    getAuthHeader,
    internalKeyHeaderName = "x-internal-key",
    internalKey,
    endpoint = "/api/otica/vendas/finalize",
    chunkSize = 1,
    maxRetries = 3,
    onProgress,
  } = opts;

  const pendentes = await db.vendas_offline.where("status").equals("pendente").toArray();
  const total = pendentes.length;
  let processed = 0;
  let success = 0;
  let failed = 0;

  async function sendVenda(venda: any) {
    // tenta obter header de auth via callback
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (getAuthHeader) {
        const auth = await getAuthHeader();
        if (auth) headers["Authorization"] = auth;
      }
    } catch (e) {
      // ignore, tentaremos fallback
    }

    if (!headers["Authorization"] && internalKey && internalKeyHeaderName) {
      headers[internalKeyHeaderName] = internalKey;
    }

    let attempt = 0;
    let lastErr: any = null;

    while (attempt < maxRetries) {
      attempt += 1;
      try {
        const bodyPayload = venda.payload_venda ?? venda.payload ?? venda;
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) return { ok: true };

        // Em caso de 401/403, abortar e devolver erro para tratamento externo
        if (res.status === 401 || res.status === 403) {
          const text = await res.text().catch(() => "");
          return { ok: false, fatal: true, status: res.status, body: text };
        }

        // para outros erros, continuar tentando
        lastErr = { status: res.status, body: await res.text().catch(() => "") };
      } catch (e) {
        lastErr = e;
      }

      // backoff simples
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }

    return { ok: false, fatal: false, error: lastErr };
  }

  // processa em série por chunk (evita paralelismo excessivo em SW)
  for (let i = 0; i < pendentes.length; i += chunkSize) {
    const batch = pendentes.slice(i, i + chunkSize);

    for (const venda of batch) {
      processed += 1;
      // marca como sincronizando para evitar reentrada
        try {
          await db.vendas_offline.update(venda.id!, { status: "sincronizando", updatedAt: new Date().toISOString() });
        } catch (e) {
        // se não conseguir marcar, continua (defensivo)
      }

      const result = await sendVenda(venda);

      if (result.ok) {
        // remove item local
        try {
          await db.vendas_offline.delete(venda.id!);
        } catch (e) {
          // se falhar ao remover, marca como "sincronizado" para não reenviar
          await db.vendas_offline.update(venda.id!, { status: "sincronizado", updatedAt: new Date().toISOString() }).catch(() => {});
        }
        success += 1;
      } else if ((result as any).fatal) {
        // erro fatal (401/403) — reverte para pendente e interrompe sincronização
        await db.vendas_offline.update(venda.id!, { status: "pendente", updatedAt: new Date().toISOString() }).catch(() => {});
        failed += 1;
        // retorna informação para o chamador para que renove token/keys
        return { ok: false, reason: "auth", detail: result };
      } else {
        // falha temporária — volta para pendente
        await db.vendas_offline.update(venda.id!, { status: "pendente", updatedAt: new Date().toISOString() }).catch(() => {});
        failed += 1;
      }

      onProgress?.({ total, processed, success, failed });
    }
  }

  return { ok: true, total, processed, success, failed };
}
