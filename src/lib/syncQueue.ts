import { db } from "./dexie-db";
import { postJson } from "./api-client";
import { supabase } from "@/lib/supabase";

export async function processQueue() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  try {
    const pendentes = await db.vendasPendentes.toArray();
    for (const item of pendentes) {
      try {
        // enviamos o job inteiro para o endpoint de sincronização server-side
        // se houver session, adicionamos Authorization header
        const sess = await supabase.auth.getSession();
        const token = (sess as any)?.data?.session?.access_token || null;
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await postJson("/api/otica/vendas/sync", { job: item }, { headers });
        if (item.id) await db.vendasPendentes.delete(item.id);
      } catch (err) {
        console.error("syncQueue: erro ao enviar venda pendente", err);
        // se falhar, continua com a próxima (será re-tentada depois)
      }
    }
  } catch (e) {
    console.error("syncQueue: falha ao processar fila", e);
  }
}

export async function addPendingVenda(venda: any) {
  try {
    const job = { ...venda };
    // if venda contains vendaData with local-only signatures, include them as pending_terms
    const vd = job.vendaData || job.venda || null;
    if (vd) {
      const pending: any[] = [];
      if (vd.assinatura_confirmacao && !vd.termo_confirmacao_id) {
        pending.push({ tipo_termo: 'Confirmacao_Compra', termo_texto: vd.termoTexto || null, assinatura_base64: vd.assinatura_confirmacao });
      }
      if (vd.assinatura_arma_responsabilidade && !vd.termo_responsabilidade_id) {
        pending.push({ tipo_termo: 'Responsabilidade_Armacao', termo_texto: vd.termoTexto || null, assinatura_base64: vd.assinatura_arma_responsabilidade });
      }
      if (pending.length) {
        // attach pending_terms on vendaData so server can insert them during sync
        if (job.vendaData) job.vendaData.pending_terms = pending;
        else if (job.venda) job.venda.pending_terms = pending;
      }
    }
    return await db.vendasPendentes.add({ ...job, createdAt: new Date().toISOString(), syncPending: 1 });
  } catch (e) {
    console.error('addPendingVenda failed', e);
    return db.vendasPendentes.add({ venda, createdAt: new Date().toISOString(), syncPending: 1 });
  }
}
