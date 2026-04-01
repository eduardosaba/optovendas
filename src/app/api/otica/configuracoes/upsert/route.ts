import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const body = await req.json();

    // Basic auth check: ensure token owner belongs to same clinica
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
    const user = (userRes as any)?.data?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perfilRes: any = await supabaseAdmin.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
    const clinicaId = perfilRes?.data?.clinica_id;
    if (!clinicaId) return NextResponse.json({ error: 'Perfil sem clínica' }, { status: 403 });

    // Ensure payload clinica_id matches
    if (body.clinica_id && String(body.clinica_id) !== String(clinicaId)) {
      return NextResponse.json({ error: 'Clinica mismatch' }, { status: 403 });
    }

    // Normalize cnpj: store only digits or null
    if (body.cnpj !== undefined && body.cnpj !== null) {
      body.cnpj = String(body.cnpj).replace(/\D/g, '') || null;
    }

    body.clinica_id = clinicaId;

    const up = await supabaseAdmin.from('otica_configuracoes').upsert(body);
    if (up.error) {
      console.error('upsert otica_configuracoes failed', up.error);
      return NextResponse.json({ error: up.error.message || up.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('config upsert error', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
