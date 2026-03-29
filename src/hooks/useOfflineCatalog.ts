"use client";

import { useCallback } from "react";
import { db } from "@/lib/dexie-db";
import { supabase } from "@/lib/supabase";

export function useOfflineCatalog() {
  const atualizarCache = useCallback(async (clinicaId: string) => {
    if (!clinicaId) return;
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;

    try {
      const produtosRes = await supabase.from("otica_produtos").select("*").eq("clinica_id", clinicaId);
      if (!produtosRes.error && produtosRes.data) {
        await db.catalogo_produtos.clear();
        // normalizar ids como string
        const prods = (produtosRes.data as any[]).map((p) => ({ ...p, id: String(p.id) }));
        await db.catalogo_produtos.bulkAdd(prods);
      }

      const precosRes = await supabase.from("otica_tabela_precos").select("*").eq("clinica_id", clinicaId);
      if (!precosRes.error && precosRes.data) {
        await db.tabela_precos.clear();
        const prec = (precosRes.data as any[]).map((r) => ({ ...r, id: String(r.id) }));
        await db.tabela_precos.bulkAdd(prec);
      }

      // eslint-disable-next-line no-console
      console.log("🔥 Cache do catálogo atualizado para uso offline.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("useOfflineCatalog: falha ao atualizar cache", err);
    }
  }, []);

  return { atualizarCache };
}
