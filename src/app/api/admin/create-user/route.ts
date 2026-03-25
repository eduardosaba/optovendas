import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Segurança: aceitar duas formas de autorização:
    // 1) header interno x-internal-key (para jobs/integrações server->server)
    // 2) Authorization: Bearer <access_token> — verifica perfil do usuário (master/admin)
    const internalKey = req.headers.get('x-internal-key');
    let allowedByAuth = false;
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
      allowedByAuth = true;
    } else {
      const authHeader = req.headers.get('authorization') || '';
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (match) {
        const token = match[1];
        // Verifica token consultando o Auth via admin client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceRole) {
          const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
          try {
            const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
            const userId = userRes?.data?.user?.id;
            if (userId) {
              const perfilRes = await supabaseAdmin.from('perfis').select('funcao').eq('id', userId).maybeSingle();
              const funcao = (perfilRes.data?.funcao || '').toLowerCase();
              if (['master', 'admin', 'admin_clinica'].includes(funcao)) allowedByAuth = true;
            }
          } catch (e) {
            console.warn('failed to validate bearer token', e);
          }
        }
      }
    }

    if (!allowedByAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
