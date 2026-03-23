import { supabase } from "@/lib/supabase";

const BUCKET = "branding-assets";

function extensaoNome(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "png";
}

export async function uploadLogoSistema(file: File) {
  const ext = extensaoNome(file.name);
  const path = `sistema/logo.${ext}`;

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadLogoClinica(clinicaId: string, file: File) {
  const ext = extensaoNome(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `clinicas/${clinicaId}/logo-unidade-${unique}.${ext}`;

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFotoPerfil(clinicaId: string, userId: string, file: File) {
  const ext = extensaoNome(file.name);
  const path = `clinicas/${clinicaId}/perfis/${userId}/foto.${ext}`;

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFotoPaciente(clinicaId: string, pacienteId: string, file: File) {
  const ext = extensaoNome(file.name);
  const path = `clinicas/${clinicaId}/pacientes/${pacienteId}/foto.${ext}`;

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
