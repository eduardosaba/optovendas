import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const internalKey = req.headers.get('x-internal-key');
    let allowedByAuth = false;

    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
      allowedByAuth = true;
    } else {
      const authHeader = req.headers.get('authorization') || '';
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (match) {
        const token = match[1];
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceRole) {
          const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
          try {
            const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
            const userId = userRes?.data?.user?.id;
            if (userId) {
              const perfilRes = await supabaseAdmin.from('perfis').select('funcao').eq('id', userId).maybeSingle();
              const funcao = (perfilRes.data?.funcao || '').toLowerCase();
              if (['master', 'admin', 'admin_clinica'].includes(funcao)) allowedByAuth = true;
            }
          } catch (e) {
            console.warn('failed to validate bearer token for update-attachments', e);
          }
        }
      }
    }

    if (!allowedByAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const { venda_id, anexos_urls, medida_obrigatoria, status_medida } = body;
    if (!venda_id) return NextResponse.json({ error: 'venda_id required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server not configured' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const payload: any = {};
    if (Array.isArray(anexos_urls)) payload.anexos_urls = anexos_urls;
    if (typeof medida_obrigatoria !== 'undefined') payload.medida_obrigatoria = medida_obrigatoria;
    if (typeof status_medida !== 'undefined') payload.status_medida = status_medida;

    if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

    const upd = await supabaseAdmin.from('vendas').update(payload).eq('id', venda_id).select().maybeSingle();
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, data: upd.data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
