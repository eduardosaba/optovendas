import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.warn('Supabase not configured for otica/tratamentos API');
}

const supabaseAdmin = supabaseUrl && serviceRole ? createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } }) : null;

async function getUserFromBearer(token: string | null) {
  if (!token || !supabaseAdmin) return null;
  try {
    const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
    return userRes?.data?.user ?? null;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    const token = match ? match[1] : null;
    const user = await getUserFromBearer(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await supabaseAdmin!.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
    const clinicaId = profile?.data?.clinica_id ?? null;
    if (!clinicaId) return NextResponse.json({ error: 'Perfil sem clínica' }, { status: 403 });

    const q = await supabaseAdmin!.from('clinica_tratamentos').select('*').eq('clinica_id', clinicaId).order('nome', { ascending: true });
    if (q.error) throw q.error;
    return NextResponse.json({ data: q.data });
  } catch (err: any) {
    console.error('tratamentos GET failed', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    const token = match ? match[1] : null;
    const user = await getUserFromBearer(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await supabaseAdmin!.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
    const clinicaId = profile?.data?.clinica_id ?? null;
    if (!clinicaId) return NextResponse.json({ error: 'Perfil sem clínica' }, { status: 403 });

    const body = await req.json();
    const payload = {
      clinica_id: clinicaId,
      nome: body.nome,
      descricao: body.descricao ?? null,
      preco: body.preco ?? null,
      ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
    };

    const ins = await supabaseAdmin!.from('clinica_tratamentos').insert(payload).select('id').maybeSingle();
    if (ins.error) throw ins.error;
    return NextResponse.json({ ok: true, id: ins.data?.id });
  } catch (err: any) {
    console.error('tratamentos POST failed', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    const token = match ? match[1] : null;
    const user = await getUserFromBearer(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const profile = await supabaseAdmin!.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
    const clinicaId = profile?.data?.clinica_id ?? null;
    if (!clinicaId) return NextResponse.json({ error: 'Perfil sem clínica' }, { status: 403 });

    const updates: any = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.descricao !== undefined) updates.descricao = body.descricao;
    if (body.preco !== undefined) updates.preco = body.preco;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    const up = await supabaseAdmin!.from('clinica_tratamentos').update(updates).eq('id', body.id).eq('clinica_id', clinicaId);
    if (up.error) throw up.error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('tratamentos PUT failed', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    const token = match ? match[1] : null;
    const user = await getUserFromBearer(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const profile = await supabaseAdmin!.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
    const clinicaId = profile?.data?.clinica_id ?? null;
    if (!clinicaId) return NextResponse.json({ error: 'Perfil sem clínica' }, { status: 403 });

    // Soft delete: set ativo = false
    const up = await supabaseAdmin!.from('clinica_tratamentos').update({ ativo: false }).eq('id', id).eq('clinica_id', clinicaId);
    if (up.error) throw up.error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('tratamentos DELETE failed', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
