import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Resource = "otica" | "financeiro" | "estoque" | "receitas" | "admin_local";

export function usePermission(recurso?: Resource) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        setLoading(true);

        // 1. Pegar Usuário Logado
        const { data: userData } = await supabase.auth.getUser();
        const user = (userData as any)?.user;
        if (!user) throw new Error("Não autenticado");

        // 2. Pegar Perfil e Dados da Clínica
        const { data: perfil, error: pErr } = await supabase
          .from("perfis")
          .select("*, clinicas(*)")
          .eq("id", user.id)
          .single();

        if (pErr || !perfil) throw new Error("Perfil não encontrado");

        // 3. REGRA MESTRE: Usuário "Master" acessa TUDO
        if (perfil.role === "master") {
          setAllowed(true);
          setCanEdit(true);
          return;
        }

        // 4. Bloqueio por Status do Usuário
        if (perfil.status !== "ativo") {
          throw new Error("Seu usuário está suspenso. Contate o administrador.");
        }

        // 5. Bloqueio por Vencimento ou Status da Clínica (SaaS Lock)
        const clinica = perfil.clinicas;
        const hoje = new Date();
        const vencimento = new Date(clinica.data_vencimento);

        if (clinica.status !== "ativo" || vencimento < hoje) {
          throw new Error("Licença expirada ou suspensa. Regularize sua assinatura.");
        }

        // 6. Se não pediu recurso específico (só quer saber se está ativo), libera
        if (!recurso) {
          setAllowed(true);
          return;
        }

        // 7. Checar Matriz de Permissões (RBAC)
        const { data: perm } = await supabase
          .from("permissoes_perfis")
          .select("*")
          .eq("role", perfil.role)
          .eq("recurso", recurso)
          .single();

        setAllowed(perm?.pode_acessar ?? false);
        setCanEdit(perm?.pode_editar ?? false);

      } catch (err: any) {
        setError(err.message);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [recurso]);

  return { loading, allowed, canEdit, error };
}
