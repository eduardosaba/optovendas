import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_KEYS = ['unificar_modulos', 'possui_otica', 'nome_fantasia', 'logomarca_url', 'cidade_sede'];

export async function GET(_req: NextRequest | Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> } | any) {
  const rawParams = ctx?.params;
  const params = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const clinicaId = params?.id;
  try {
    const { data: sessionData } = await supabase.auth.getUser();
    const user = sessionData?.user ?? null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(_req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(200, Math.max(5, Number(url.searchParams.get('pageSize') || '20')));
    const chave = url.searchParams.get('chave') || undefined;
    const usuario = url.searchParams.get('usuario') || undefined;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const dataQuery = supabase
      .from('clinica_config_audit')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('alterado_em', { ascending: false });

    if (chave) dataQuery.eq('chave', chave);
    if (usuario) dataQuery.eq('alterado_por', usuario);
    if (from) dataQuery.gte('alterado_em', from);
    if (to) dataQuery.lte('alterado_em', to);

    const dataRes = await dataQuery.range(start, end);

    const countQuery = supabase.from('clinica_config_audit').select('id', { count: 'exact', head: true }).eq('clinica_id', clinicaId);
    if (chave) countQuery.eq('chave', chave);
    if (usuario) countQuery.eq('alterado_por', usuario);
    if (from) countQuery.gte('alterado_em', from);
    if (to) countQuery.lte('alterado_em', to);

    const countRes = await countQuery;

    if (dataRes.error) return NextResponse.json({ error: dataRes.error.message }, { status: 500 });
    if (countRes.error) return NextResponse.json({ error: countRes.error.message }, { status: 500 });

    const total = countRes.count ?? 0;
    return NextResponse.json({ data: dataRes.data || [], total, page, pageSize });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest | Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> } | any) {
  const rawParams = ctx?.params;
  const params = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const clinicaId = params?.id;
  try {
    const { data: sessionData } = await supabase.auth.getUser();
    const user = sessionData?.user ?? null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { chave, valor_novo } = body as { chave: string; valor_novo: any };

    if (!chave) return NextResponse.json({ error: 'Missing chave' }, { status: 400 });
    if (!ALLOWED_KEYS.includes(chave)) return NextResponse.json({ error: 'Chave não permitida' }, { status: 400 });

    // buscar valor atual
    const { data: current, error: selErr } = await supabase.from('clinicas').select(chave).eq('id', clinicaId).maybeSingle();
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
    const valor_antigo = current ? String((current as any)[chave]) : null;

    // atualizar clinica
    const { error: upErr } = await supabase.from('clinicas').update({ [chave]: valor_novo }).eq('id', clinicaId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // registrar auditoria
    const { error: auditErr } = await supabase.from('clinica_config_audit').insert({
      clinica_id: clinicaId,
      chave,
      valor_antigo: valor_antigo,
      valor_novo: String(valor_novo),
      alterado_por: user.id,
    });
    if (auditErr) {
      console.warn('Falha ao registrar auditoria:', auditErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
