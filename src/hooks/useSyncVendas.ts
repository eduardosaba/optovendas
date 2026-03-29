"use client";

import { db } from "@/lib/dexie-db";
import { supabase } from "@/lib/supabase";

export async function processVendasOffline() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  try {
    const pendentes = await db.vendas_offline.where("status").equals("pendente").toArray();
    for (const item of pendentes) {
      try {
        let urlFoto = "";

        if (item.foto_pupilometro) {
          const fileName = `offline_medidas/${Date.now()}_${item.id || Math.random().toString(36).slice(2, 8)}.jpg`;
          // supabase.storage.upload aceita Blob/File
          const uploadRes = await supabase.storage.from("public_docs").upload(fileName, item.foto_pupilometro as any, {
            upsert: false,
          });

          if (!uploadRes.error && uploadRes.data) {
            const pub = supabase.storage.from("public_docs").getPublicUrl(uploadRes.data.path);
            urlFoto = (pub as any)?.data?.publicUrl || "";
          }
        }

        const vendaFinal: any = {
          ...(item.payload_venda || {}),
          pupilometro_foto_url: urlFoto || null,
        };

        // Garantir compatibilidade: se cliente enviou status_financeiro, propagar para status_pagamento
        vendaFinal.status_pagamento = vendaFinal.status_pagamento ?? vendaFinal.status_financeiro ?? null;

        const insertRes = await supabase.from("otica_vendas").insert(vendaFinal);
        if (!insertRes.error) {
          await db.vendas_offline.delete(item.id!);
        }
      } catch (err) {
        // se falhar, continuar com o próximo
        // eslint-disable-next-line no-console
        console.error("processVendasOffline: erro ao processar item", err);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("processVendasOffline: falha geral", e);
  }
}

export function useSyncVendas() {
  // hook leve para expor o processador manualmente
  return { processVendasOffline };
}
