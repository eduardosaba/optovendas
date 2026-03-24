import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId } = body;
    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server not configured' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // Recupera o profile para obter user_id (se vinculado ao Auth)
    const { data, error } = await supabaseAdmin.from('profiles').select('id, user_id').eq('id', profileId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Deleta o registro de profile
    const del = await supabaseAdmin.from('profiles').delete().eq('id', profileId);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

    // Se havia um user_id, tente remover o usuário do Auth também (não bloqueia se falhar)
    const userId = (data as any)?.user_id;
    if (userId) {
      try {
        await (supabaseAdmin as any).auth.admin.deleteUser(userId);
      } catch (e) {
        console.warn('failed delete auth user', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
