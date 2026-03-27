import { supabase } from "@/lib/supabase";

export type ClinicaContext = {
  userId: string;
  clinicaId: string;
  oticaId?: string | null;
  funcao: string;
  isMaster: boolean;
};

export async function resolveClinicaContext(): Promise<ClinicaContext> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (sessionError || !user) {
    // Remove sessao local corrompida/expirada para evitar erros repetidos de 403 no auth endpoint.
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  const userId = user.id;

  type PerfilRow = { clinica_id?: string; funcao?: string; otica_id?: string };

  async function lerPerfilAtual(): Promise<PerfilRow | null> {
    const perfisRes = await supabase
      .from("perfis")
      .select("clinica_id, funcao")
      .eq("id", userId)
      .maybeSingle();

    if (perfisRes.error) {
      throw new Error(`Falha ao ler perfil do usuario: ${perfisRes.error.message}`);
    }

    return (perfisRes.data ?? null) as PerfilRow | null;
  }

  let perfil = await lerPerfilAtual();

  // Auto-heal: tenta sincronizar cadastro de equipe/perfil quando o registro ainda nao foi criado.
  if (!perfil) {
    await supabase.rpc("sync_current_user_membership");
    perfil = await lerPerfilAtual();
  }

  const metadataClinicaId = (user.user_metadata?.clinica_id as string | undefined) ?? undefined;
  const metadataFuncao = (user.user_metadata?.funcao as string | undefined) ?? undefined;
  const metadataOticaId = (user.user_metadata?.otica_id as string | undefined) ?? undefined;

  let profile: { clinica_id?: string; otica_id?: string } | null = null;
  if (!perfil?.clinica_id && !metadataClinicaId) {
    const profilesRes = await supabase
      .from("profiles")
      .select("clinica_id, otica_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profilesRes.error) {
      throw new Error(`Falha ao ler fallback de clinica em profiles: ${profilesRes.error.message}`);
    }

    profile = (profilesRes.data ?? null) as { clinica_id?: string } | null;
  }

  // Mantém a prioridade original de clinica, mas trata MASTER como exceção.
  const clinicaId = perfil?.clinica_id ?? profile?.clinica_id ?? metadataClinicaId;
  const oticaId = perfil?.otica_id ?? profile?.otica_id ?? metadataOticaId ?? null;

  // Normaliza a função (força lower case) e define um padrão 'vendas'
  // para forçar a busca real no banco quando não houver valor explícito.
  const rawFuncao = (perfil?.funcao ?? metadataFuncao ?? "vendas").toLowerCase();
  const isMaster = rawFuncao === "master";

  // Se não houver clinica vinculada e o usuário não for master, erro.
  if (!clinicaId && !isMaster) {
    throw new Error("Perfil sem clinica vinculada. Contate o administrador.");
  }

  return {
    userId: user.id,
    // Se for master e nao tiver clinicaId, retorna 'master' para queries globais.
    clinicaId: clinicaId || "master",
    oticaId,
    funcao: rawFuncao,
    isMaster,
  };
}

export async function bootstrapClinicaForCurrentUser(nomeFantasia: string): Promise<string> {
  const { data, error } = await supabase.rpc("bootstrap_clinica_for_current_user", {
    p_nome_fantasia: nomeFantasia,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nao foi possivel inicializar a clinica.");
  }

  return String(data);
}
