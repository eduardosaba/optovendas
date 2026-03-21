import { supabase } from "@/lib/supabase";

export type ClinicaContext = {
  userId: string;
  clinicaId: string;
  funcao: string;
  isMaster: boolean;
};

export async function resolveClinicaContext(): Promise<ClinicaContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  const perfisRes = await supabase
    .from("perfis")
    .select("clinica_id, funcao")
    .eq("id", user.id)
    .single();
  const perfil = (perfisRes.data ?? null) as { clinica_id?: string; funcao?: string } | null;

  const profilesRes = await supabase
    .from("profiles")
    .select("clinica_id")
    .eq("user_id", user.id)
    .single();
  const profile = (profilesRes.data ?? null) as { clinica_id?: string } | null;

  const metadataClinicaId = (user.user_metadata?.clinica_id as string | undefined) ?? undefined;

  const clinicaId = perfil?.clinica_id ?? profile?.clinica_id ?? metadataClinicaId ?? user.id;
  const funcao = perfil?.funcao ?? "admin_clinica";

  return {
    userId: user.id,
    clinicaId,
    funcao,
    isMaster: funcao === "master",
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
