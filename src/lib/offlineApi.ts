import { db, VendaOffline } from "@/lib/dexie-db";

export async function saveVendaOffline(venda: Partial<VendaOffline>) {
  const payload: VendaOffline = {
    cliente_nome: venda.cliente_nome || null,
    payload_venda: venda.payload_venda || {},
    foto_pupilometro: (venda.foto_pupilometro as any) || null,
    foto_receita: (venda.foto_receita as any) || null,
    status: "pendente",
    criado_em: venda.criado_em || Date.now(),
  } as VendaOffline;

  return db.vendas_offline.add(payload);
}

export async function listPendentesCount() {
  return db.vendas_offline.where("status").equals("pendente").count();
}
