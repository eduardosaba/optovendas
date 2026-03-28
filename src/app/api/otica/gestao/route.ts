import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(String(SUPABASE_URL), String(SUPABASE_SERVICE_ROLE));

function normalizeStatus(s: string | null | undefined) {
  const valor = (s ?? '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (valor.includes('laboratorio')) return 'Laboratorio';
  if (valor.includes('produc') || valor.includes('producao') || valor.includes('em producao')) return 'Em Producao';
  if (valor.includes('pronto')) return 'Pronto';
  if (valor.includes('entrega') || valor.includes('entreg')) return 'Entrega';
  return 'Laboratorio';
}

export async function GET(req: NextRequest | Request) {
  try {
    const url = new URL(req.url);
    const clinicaId = url.searchParams.get('clinicaId');
    if (!clinicaId) return NextResponse.json({ error: 'missing clinicaId' }, { status: 400 });

    const { data: ordens, error } = await supabaseAdmin
      .from('ordens_servico')
      .select('id, status_os, laboratorio_nome, previsao_entrega, vendas(id, status_financeiro, tipo_fechamento, saldo_restante, financeiro)')
      .eq('clinica_id', clinicaId)
      .order('previsao_entrega', { ascending: true })
      .limit(2000);

    if (error) throw error;

    const gargalos: Record<string, number> = { Laboratorio: 0, 'Em Producao': 0, Pronto: 0, Entrega: 0 };
    const labsCount: Record<string, number> = {};
    let somaCrediario = 0;
    let vendasCount = 0;
    let somaTicket = 0;

    (ordens || []).forEach((os: any) => {
      const st = normalizeStatus(os.status_os);
      gargalos[st] = (gargalos[st] || 0) + 1;

      const lab = os.laboratorio_nome || 'Interno';
      labsCount[lab] = (labsCount[lab] || 0) + 1;

      const venda = Array.isArray(os.vendas) ? os.vendas[0] : os.vendas;
      if (venda) {
        vendasCount += 1;
        const financeiro = venda.financeiro || venda.financeiro || null;
        const total = financeiro?.total ?? financeiro ?? 0;
        somaTicket += Number(total || 0);

        if ((venda.tipo_fechamento || '').toString().toLowerCase().includes('crediario')) {
          somaCrediario += Number(venda.saldo_restante || 0);
        }
      }
    });

    const ticketMedio = vendasCount > 0 ? somaTicket / vendasCount : 0;

    const topLabs = Object.entries(labsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, cnt]) => ({ laboratorio: nome, count: cnt }));

    return NextResponse.json({ gargalos, topLabs, somaCrediario, ticketMedio: Number(ticketMedio.toFixed(2)), totalOrdens: ordens?.length ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
