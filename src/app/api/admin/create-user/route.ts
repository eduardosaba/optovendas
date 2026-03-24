import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinica_id, nome_completo, email, perfil, ativo, password } = body;
    if (!clinica_id || !email || !nome_completo) return NextResponse.json({ error: 'clinica_id, nome_completo and email required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server not configured' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // gerar senha temporária se não veio
    const tempPassword = password || ('Tmp!' + Math.random().toString(36).slice(2, 10) + '!');

    const createRes: any = await (supabaseAdmin as any).auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      user_metadata: { nome_completo, clinica_id, perfil }
    });

    if (createRes.error) return NextResponse.json({ error: createRes.error.message }, { status: 500 });

    const userId = createRes.user?.id ?? createRes?.data?.id ?? null;

    // Inserir na tabela usuarios_unidade (vinculo principal da equipe por clinica)
    const insertRes = await supabaseAdmin.from('usuarios_unidade').insert({
      clinica_id,
      nome_completo,
      email: email.toLowerCase().trim(),
      perfil,
      ativo: !!ativo,
      user_id: userId,
    }).select('id, nome_completo, email, perfil, ativo').single();

    if (insertRes.error) {
      console.error('failed insert usuarios_unidade', insertRes.error);
      // Evita usuario orfao no Auth sem vinculo de equipe.
      if (userId) {
        try {
          await (supabaseAdmin as any).auth.admin.deleteUser(userId);
        } catch (cleanupError) {
          console.warn('failed cleanup auth user after usuarios_unidade error', cleanupError);
        }
      }
      return NextResponse.json({ error: `Falha ao vincular usuário à clínica: ${insertRes.error.message}` }, { status: 500 });
    }

    // Enviar e-mail de redefinição para forçar troca da senha no primeiro acesso
    try {
      await (supabaseAdmin as any).auth.resetPasswordForEmail(email.toLowerCase().trim());
    } catch (e) {
      console.warn('failed send reset email', e);
    }

    return NextResponse.json({ ok: true, user: insertRes.data, tempPassword: password ? null : tempPassword });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
