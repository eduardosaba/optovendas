import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await req.json();

    // Require clinica_id in payload when called from client
    const clinicaId = body?.clinica_id;
    if (!clinicaId) {
      return NextResponse.json({ error: 'ID da clínica não fornecido' }, { status: 400 });
    }

    // Prepare payload with normalized fields
    const payload: any = {
      clinica_id: clinicaId,
      nome_otica: body.nome_otica,
      cnpj: body.cnpj ? String(body.cnpj).replace(/\D/g, '') : null,
      telefone: body.telefone,
      whatsapp: body.whatsapp,
      email: body.email,
      endereco: body.endereco,
      cidade: body.cidade,
      logo_url: body.logo_url,
      mensagem_rodape: body.mensagem_rodape,
      cobrar_comissao: !!body.cobrar_comissao,
      comissao_padrao_porcentagem: Number(body.comissao_padrao_porcentagem || 0),
      meta_mensal: Number(body.meta_mensal || 0),
      limite_desconto_vendedor: Number(body.limite_desconto_vendedor || 5),
      limite_desconto_gerente: Number(body.limite_desconto_gerente || 15),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('otica_configuracoes')
      .upsert(payload as any, { onConflict: 'clinica_id' })
      .select()
      .single();

    if (error) {
      console.error('Erro Supabase Admin:', error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Erro Crítico API:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
