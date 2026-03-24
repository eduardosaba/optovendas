import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinica_id, nome_completo, email, perfil, ativo, password } = body;
    
    if (!clinica_id || !email || !nome_completo) 
      return NextResponse.json({ error: 'clinica_id, nome_completo e email são obrigatórios' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRole) 
      return NextResponse.json({ error: 'Servidor não configurado (Service Role faltando)' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { 
      auth: { persistSession: false, autoRefreshToken: false } 
    });

    // Senha padrão ou vinda do form
    const finalPassword = password || 'Mudar@123';

    // CRIAÇÃO COM CONFIRMAÇÃO AUTOMÁTICA
    const { data: authRes, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: finalPassword,
      email_confirm: true, // AQUI: Valida o e-mail instantaneamente
      user_metadata: { nome_completo, clinica_id, perfil }
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    const userId = authRes.user?.id;

    // Inserir na tabela usuarios_unidade
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('usuarios_unidade')
      .insert({
        clinica_id,
        nome_completo,
        email: email.toLowerCase().trim(),
        perfil,
        ativo: !!ativo,
        user_id: userId,
      })
      .select()
      .single();

    if (dbError) {
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Erro no banco: ${dbError.message}` }, { status: 500 });
    }

    // REMOVIDO: resetPasswordForEmail (para não enviar e-mail e deixar logar direto)

    return NextResponse.json({ 
      ok: true, 
      user: dbData, 
      msg: "Usuário ativado e pronto para login!" 
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
