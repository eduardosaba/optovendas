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
  return db.vendasPendentes.add({ venda, createdAt: new Date().toISOString(), syncPending: true });
}
