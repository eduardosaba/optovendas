import { NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import PDFCarne from '@/components/otica/DocumentoCarne';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { venda, parcelas = [], cliente, clinicaId } = body as any;

    // Determine clinic info (prefer service role access)
    let clinica: any = null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey && clinicaId) {
      try {
        const supa = createClient(supabaseUrl, serviceKey);
        // Preferir configurações específicas da ótica
        const { data: oticaCfg, error: oticaErr } = await supa
          .from('otica_configuracoes')
          .select('nome_otica, logo_url, cnpj, whatsapp, mensagem_rodape')
          .eq('clinica_id', clinicaId)
          .maybeSingle();

        if (!oticaErr && oticaCfg) {
          clinica = {
            nome_fantasia: (oticaCfg as any).nome_otica || null,
            logomarca_url: (oticaCfg as any).logo_url || null,
            cnpj: (oticaCfg as any).cnpj || null,
            whatsapp: (oticaCfg as any).whatsapp || null,
            mensagem_rodape: (oticaCfg as any).mensagem_rodape || null,
          };
        } else {
          // fallback para tabela clinicas
          const { data: cli, error: cliErr } = await supa.from('clinicas').select('nome_fantasia, logomarca_url').eq('id', clinicaId).maybeSingle();
          if (!cliErr && cli) clinica = cli;
        }
      } catch (e) {
        console.warn('failed fetching clinica/otica_configuracoes', e);
      }
    }

    // Render PDF to buffer (pass clinic info if available)
    const paciente = cliente ?? venda?.paciente ?? null;
    const doc = pdf(<PDFCarne venda={venda} parcelas={parcelas} paciente={paciente} config={clinica} />);
    const buffer = await doc.toBuffer();

    // `doc.toBuffer()` may return a Buffer or a stream-like value depending on environment.
    let buf: Buffer;
    if (Buffer.isBuffer(buffer)) {
      buf = buffer as Buffer;
    } else {
      // attempt to read as a stream/Response and convert to Buffer
      const ab = await (buffer as any).arrayBuffer?.() ?? await new Response(buffer as any).arrayBuffer();
      buf = Buffer.from(new Uint8Array(ab));
    }

    // If service role key exists, upload to Supabase storage and return public URL
    if (supabaseUrl && serviceKey && clinicaId) {
      const supa = createClient(supabaseUrl, serviceKey);
        // build sanitized filename using cliente name when possible
        const clienteNome = (cliente?.nome_completo) || (venda?.clienteManualNome) || (venda?.paciente?.nome_completo) || 'venda';
        const sanitize = (s: string) => String(s || '').replace(/\s+/g, '').replace(/[^\w-]/g, '');
        const filename = `carne_vendas_${sanitize(clienteNome)}.pdf`;
        const path = `clinicas/${clinicaId}/carnes/${filename}`;
      const { error: upErr } = await supa.storage.from('branding-assets').upload(path, buf, { contentType: 'application/pdf', upsert: true });
      if (upErr) {
        console.warn('upload error', upErr);
        // fallback to data URL
        return NextResponse.json({ url: `data:application/pdf;base64,${buf.toString('base64')}` });
      }
      const publicUrl = supa.storage.from('branding-assets').getPublicUrl(path).data?.publicUrl || null;
      return NextResponse.json({ url: publicUrl });
    }

    // fallback: return data URL for client to open
    return NextResponse.json({ url: `data:application/pdf;base64,${buf.toString('base64')}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
