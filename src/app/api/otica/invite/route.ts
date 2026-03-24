import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, display_name, clinica_id } = body;
    if (!email || !clinica_id) return NextResponse.json({ error: 'email and clinica_id required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server not configured' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // gerar senha temporária segura
    const tempPassword = 'Tmp!' + Math.random().toString(36).slice(2, 10) + '!';

    // Criar usuário no Auth (requere privilege de service role)
    // Note: supabase-js v2 expõe admin.createUser() em auth.admin
    // Ajuste se sua versão da lib tiver API diferente.
    const createRes: any = await (supabaseAdmin as any).auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      user_metadata: { display_name, clinica_id }
    });

    if (createRes.error) return NextResponse.json({ error: createRes.error.message }, { status: 500 });

    const userId = createRes.user?.id ?? createRes?.data?.id ?? null;

    // Inserir registro em `profiles` vinculando ao auth.user
    if (userId) {
      const insertRes = await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        clinica_id,
        nome_exibicao: display_name,
        email: email.toLowerCase().trim()
      });
      if (insertRes.error) {
        // não fatal: log e continua
        console.error('failed insert profile', insertRes.error);
      }
    }

    // Enviar e-mail de redefinição para que o usuário troque a senha no primeiro acesso
    // A API client tem resetPasswordForEmail; usamos a instância admin para forçar envio.
    try {
      await (supabaseAdmin as any).auth.resetPasswordForEmail(email.toLowerCase().trim());
    } catch (e) {
      // se não funcionar, não bloqueamos o fluxo — o admin já tem a senha temporária
      console.warn('failed send reset email', e);
    }

    return NextResponse.json({ ok: true, tempPassword: tempPassword });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
