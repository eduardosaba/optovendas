import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
    if (!hash) {
      return NextResponse.json({ error: "Hash inválido" }, { status: 400 });
    }

    // 1. Tenta buscar em ordens_servico por hash_publico ou id
    let osData: any = null;
    let pacienteData: any = null;
    let clinicaData: any = null;

    const { data: osMatch, error: osErr } = await supabase
      .from("ordens_servico")
      .select(`
        *,
        venda:venda_id (
          *,
          pacientes (*)
        )
      `)
      .or(`hash_publico.eq.${hash},id.eq.${hash}`)
      .maybeSingle();

    if (osMatch) {
      osData = osMatch;
      pacienteData = osMatch.venda?.pacientes;
    } else {
      // 2. Tenta buscar em vendas por hash_publico ou id
      const { data: vendaMatch } = await supabase
        .from("vendas")
        .select(`
          *,
          pacientes (*),
          ordens_servico (*)
        `)
        .or(`hash_publico.eq.${hash},id.eq.${hash}`)
        .maybeSingle();

      if (vendaMatch) {
        osData = vendaMatch.ordens_servico?.[0] || vendaMatch;
        pacienteData = vendaMatch.pacientes;
      }
    }

    // Se não encontrou no banco, envia um retorno formatado amigável
    if (!osData) {
      return NextResponse.json(
        {
          numeroOS: `OS-${hash.slice(0, 6).toUpperCase()}`,
          clientePrimeiroNome: "Cliente",
          nomeOtica: "Ótica OptoVendas",
          telefoneOtica: "75999999999",
          enderecoOtica: "Atendimento Presencial",
          dataPrometida: "A combinar",
          statusAtual: "orcamento",
          tipoArmacao: "Armação Cadastrada",
          tipoLente: "Lente Monofocal / Multifocal Digital",
        },
        { status: 200 }
      );
    }

    // LGPD: Primeiro Nome + Inicial do Sobrenome
    const nomeCompleto = pacienteData?.nome_completo || osData.paciente_nome || "Cliente";
    const partesNome = nomeCompleto.trim().split(" ");
    const primeiroNome = partesNome[0];
    const inicialSobrenome = partesNome.length > 1 ? ` ${partesNome[1][0]}.` : "";
    const nomeLGPD = `${primeiroNome}${inicialSobrenome}`;

    // Normalização da Data Prometida
    const dataEntregaRaw = osData.previsao_entrega || osData.data_previsao;
    const dataPrometida = dataEntregaRaw
      ? new Date(dataEntregaRaw).toLocaleDateString("pt-BR")
      : "A combinar";

    // Status da produção
    const statusAtual =
      osData.status_laboratorio ||
      osData.status_producao ||
      (osData.status_os === "Pronto" ? "pronto" : "surfacagem");

    return NextResponse.json({
      numeroOS: osData.numero_os || `OS-${osData.id.slice(0, 6).toUpperCase()}`,
      clientePrimeiroNome: nomeLGPD,
      nomeOtica: "Ótica OptoVendas",
      telefoneOtica: pacienteData?.celular || "75999999999",
      enderecoOtica: pacienteData?.cidade_atendimento || "Unidade Central",
      dataPrometida,
      statusAtual,
      tipoArmacao: osData.armacao_modelo || osData.armacao_marca || "Armação de Mostruário",
      tipoLente: osData.material_lente || "Lente Monofocal / Multifocal Digital",
    });
  } catch (error: any) {
    console.error("Erro na API pública de rastreamento de OS:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
