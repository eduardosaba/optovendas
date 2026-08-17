import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Servidor não configurado (Service Role Ausente)" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const demoEmail = "demo@optovendas.com.br";
    const demoPassword = "DemoOpto2026!";

    // 1. Verificar se a clínica demo existe ou criar uma nova
    let clinicaId: string;
    const { data: clinicaExistente } = await supabaseAdmin
      .from("clinicas")
      .select("id")
      .eq("nome_fantasia", "Ótica & Clínica Demonstração")
      .maybeSingle();

    if (clinicaExistente?.id) {
      clinicaId = clinicaExistente.id;
    } else {
      const { data: novaClinica, error: clinicaErr } = await supabaseAdmin
        .from("clinicas")
        .insert({
          nome_fantasia: "Ótica & Clínica Demonstração",
          possui_otica: true,
          possui_consultorio: true,
          status: "ativo",
        })
        .select("id")
        .single();

      if (clinicaErr || !novaClinica) {
        // Fallback: pega a primeira clinica cadastrada
        const { data: primeiraClinica } = await supabaseAdmin
          .from("clinicas")
          .select("id")
          .limit(1)
          .single();

        clinicaId = primeiraClinica?.id || "master";
      } else {
        clinicaId = novaClinica.id;
      }
    }

    // 2. Verificar se o usuário demo já existe no Auth
    let userId: string;
    const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingDemoUser = listUsers?.users?.find(
      (u) => u.email?.toLowerCase() === demoEmail
    );

    if (existingDemoUser) {
      userId = existingDemoUser.id;
      // Garante que a senha está atualizada
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          nome_completo: "Usuário Demonstração",
          clinica_id: clinicaId,
          funcao: "admin",
        },
      });
    } else {
      // Cria o usuário demo no Auth com confirmação automática
      const { data: newAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          nome_completo: "Usuário Demonstração",
          clinica_id: clinicaId,
          funcao: "admin",
        },
      });

      if (authErr || !newAuth.user) {
        return NextResponse.json(
          { error: authErr?.message || "Erro ao criar usuário demo" },
          { status: 500 }
        );
      }
      userId = newAuth.user.id;
    }

    // 3. Garantir vínculo na tabela perfis e usuarios_unidade
    await Promise.all([
      supabaseAdmin.from("perfis").upsert({
        id: userId,
        nome: "Usuário Demonstração",
        funcao: "admin",
        clinica_id: clinicaId,
      }),
      supabaseAdmin.from("usuarios_unidade").upsert(
        {
          user_id: userId,
          clinica_id: clinicaId,
          nome_completo: "Usuário Demonstração",
          email: demoEmail,
          perfil: "admin",
          ativo: true,
        },
        { onConflict: "user_id" }
      ),
    ]);

    return NextResponse.json({
      ok: true,
      email: demoEmail,
      password: demoPassword,
      msg: "Ambiente demo provisionado com sucesso",
    });
  } catch (err: any) {
    console.error("Erro na API demo-login:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno na rota demo" },
      { status: 500 }
    );
  }
}
