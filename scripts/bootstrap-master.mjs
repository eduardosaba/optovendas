#!/usr/bin/env node
import process from "node:process";

function getArg(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`[${res.status}] ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const email = getArg("email").trim().toLowerCase();
  const password = getArg("password").trim();
  const nome = getArg("nome", "Eduardo Pedro").trim();
  const clinicaIdArg = getArg("clinica-id").trim();

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.");
  }

  if (!email || !password) {
    throw new Error("Uso: node scripts/bootstrap-master.mjs --email <email> --password <senha> [--nome <nome>]");
  }

  const headers = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    "Content-Type": "application/json",
  };

  const list = await requestJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers,
  });

  const users = Array.isArray(list?.users) ? list.users : [];
  let user = users.find((u) => String(u?.email || "").toLowerCase() === email) ?? null;

  if (!user) {
    user = await requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
        },
      }),
    });
    console.log(`Usuario criado: ${email}`);
  } else {
    user = await requestJson(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          ...(user.user_metadata || {}),
          nome,
        },
      }),
    });
    console.log(`Usuario atualizado: ${email}`);
  }

  const userId = user?.id;
  if (!userId) {
    throw new Error("Nao foi possivel obter user.id apos criar/atualizar usuario.");
  }

  const clinicaId = clinicaIdArg || userId;

  await requestJson(`${supabaseUrl}/rest/v1/perfis?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      nome,
      funcao: "master",
      clinica_id: clinicaId,
    }),
  }).catch(async () => {
    await requestJson(`${supabaseUrl}/rest/v1/perfis`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: userId,
        nome,
        funcao: "master",
        clinica_id: clinicaId,
      }),
    });
  });

  console.log(`Perfil master garantido para ${email} (id=${userId}, clinica_id=${clinicaId}).`);
}

main().catch((err) => {
  console.error("Falha no bootstrap do master:", err.message);
  process.exit(1);
});
