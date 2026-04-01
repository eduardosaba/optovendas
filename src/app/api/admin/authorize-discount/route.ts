import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const senhaFornecida = String(body?.senha || '').trim();

    if (!senhaFornecida) return NextResponse.json({ error: 'Senha vazia' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      console.error('authorize-discount: missing supabase config', { hasUrl: !!supabaseUrl, hasServiceRole: !!serviceRole });
      return NextResponse.json({ error: 'server missing config' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // Buscamos todos os perfis que tenham um PIN configurado e filtramos permissões em memória
    const { data: users, error: qError } = await supabaseAdmin
      .from('perfis')
      .select('id, nome, funcao, senha_autorizacao')
      .not('senha_autorizacao', 'is', null);

    if (qError) {
      console.error('authorize-discount: query error', qError);
      return NextResponse.json({ error: 'query failed' }, { status: 500 });
    }

    const autorizado = (users || []).find((u: any) => {
      const senhaOk = String(u.senha_autorizacao || '').trim() === senhaFornecida;
      const func = String(u.funcao || '').toLowerCase();
      const temPoder = func.includes('admin') || func.includes('master') || func.includes('gerente');
      return senhaOk && temPoder;
    });

    if (!autorizado) {
      return NextResponse.json({ ok: false, message: 'Não autorizado ou nível insuficiente' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, perfil: { id: autorizado.id, nome: autorizado.nome, funcao: autorizado.funcao } });
  } catch (e: any) {
    console.error('authorize-discount: unexpected error', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
