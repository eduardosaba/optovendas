import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.match(/^Bearer\s+(.*)$/i)?.[1] ?? null;

  const config = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasInternalKey: !!process.env.INTERNAL_API_KEY,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ config, error: 'server-missing-config' }, { status: 500 });
  }

  if (!token) return NextResponse.json({ config, error: 'No token provided' }, { status: 400 });

  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    // valida token
    const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
    const user = userRes?.data?.user ?? null;
    const authError = userRes?.error ?? null;

    let perfil = null;
    if (user) {
      const perfilRes = await supabaseAdmin
        .from('perfis')
        .select('*')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
      perfil = perfilRes?.data ?? null;
    }

    return NextResponse.json({ config, user: user ? { id: user.id, email: user.email } : null, authError, perfilEncontrado: perfil });
  } catch (e: any) {
    console.error('diag error', e);
    return NextResponse.json({ config, error: String(e) }, { status: 500 });
  }
}
