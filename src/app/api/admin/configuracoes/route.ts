import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) {
  // do not throw at import time; handlers will check
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server missing config' }, { status: 500 });
    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const chave = url.searchParams.get('chave');
    const clinicaId = url.searchParams.get('clinicaId') || null;
    if (!chave) return NextResponse.json({ error: 'missing chave param' }, { status: 400 });

    const q = supabaseAdmin.from('sistema_configuracoes').select('*').eq('chave', chave).eq('clinica_id', clinicaId).maybeSingle();
    const res: any = await q;
    if (res.error) return NextResponse.json({ error: String(res.error) }, { status: 500 });
    if (!res.data) {
      // fallback to global (clinica_id IS NULL)
      const g = await supabaseAdmin.from('sistema_configuracoes').select('*').eq('chave', chave).is('clinica_id', null).maybeSingle();
      if (g.error) return NextResponse.json({ error: String(g.error) }, { status: 500 });
      return NextResponse.json({ config: g.data ?? null });
    }
    return NextResponse.json({ config: res.data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server missing config' }, { status: 500 });
    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const body = await req.json().catch(() => null);
    if (!body || !body.chave) return NextResponse.json({ error: 'missing payload' }, { status: 400 });
    const clinicaId = body.clinicaId ?? null;
    const payload = {
      chave: body.chave,
      valor: body.valor ?? null,
      descricao: body.descricao ?? null,
      clinica_id: clinicaId,
    };

    const up = await supabaseAdmin.from('sistema_configuracoes').upsert(payload, { onConflict: 'chave,clinica_id' as any });
    if (up.error) return NextResponse.json({ error: String(up.error) }, { status: 500 });
    return NextResponse.json({ ok: true, data: up.data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
