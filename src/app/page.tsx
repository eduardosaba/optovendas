import Link from "next/link";
import { Eye, Glasses, Ruler, CreditCard, Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

function FeatureCard({
  id,
  icon,
  badge,
  titulo,
  texto,
  destaques,
}: {
  id?: string;
  icon: React.ReactNode;
  badge: string;
  titulo: string;
  texto: string;
  destaques: string[];
}) {
  return (
    <article
      id={id}
      className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
            {icon}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
        <h3 className="text-xl font-black text-slate-900 leading-tight">{titulo}</h3>
        <p className="leading-relaxed text-sm font-medium text-slate-600">{texto}</p>
      </div>

      <ul className="space-y-2 pt-4 border-t border-slate-100 text-xs font-bold text-slate-700">
        {destaques.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function VendasPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#dbeafe,transparent_35%),radial-gradient(circle_at_85%_0%,#bae6fd,transparent_30%),#f8fafc] text-slate-900">
      {/* NAVBAR NAVEGAÇÃO COM LOGO ATUALIZADA */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-24 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto%20(1).png"
              alt="OptoVendas"
              className="h-20 w-auto object-contain transition group-hover:scale-105"
            />
          </Link>

          <div className="hidden gap-8 text-sm font-bold text-slate-700 md:flex">
            <a href="#modulos" className="transition hover:text-blue-600">Módulos</a>
            <a href="#itinerante" className="transition hover:text-blue-600">Atendimento Externo</a>
            <a href="#cta" className="transition hover:text-blue-600">Teste Grátis</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <Sparkles size={14} className="text-amber-500" /> Ver Demonstração
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
            >
              Área do Cliente
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="px-6 pb-24 pt-36">
        <div className="mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-2">
          <div>
            <span className="rounded-full bg-blue-100 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-blue-700">
              SaaS para Optometristas e Óticas
            </span>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] md:text-7xl">
              Clínica, ótica e financeiro em <span className="text-blue-600">um único painel</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 font-medium">
              Troque planilhas por previsibilidade. Organize prontuários, ordens de serviço, pupilômetro virtual por câmera e crediário com foco total em faturamento.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/cadastro"
                className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700 hover:scale-[1.02]"
              >
                Começar Teste Grátis
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Sparkles className="text-amber-500" size={20} /> Ver Demonstração Demo
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-cyan-200/70 blur-2xl" />
            <div className="absolute -right-6 bottom-6 h-44 w-44 rounded-full bg-blue-300/60 blur-2xl" />
            <div className="relative rotate-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="-rotate-2 rounded-2xl bg-slate-900 p-6 text-white space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Dashboard Diário em Tempo Real</p>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded">Online</span>
                </div>
                <p className="text-4xl font-black">R$ 18.470,00</p>
                <p className="text-xs text-slate-300 font-medium">Faturamento da semana consolidado</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-400 font-bold">Consultas Realizadas</p>
                    <p className="text-2xl font-black">32</p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-400 font-bold">OS em Montagem</p>
                    <p className="text-2xl font-black text-cyan-400">9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DETALHADA DOS MÓDULOS */}
      <section id="modulos" className="bg-white py-24 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
              Recursos Especializados
            </span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Tudo o que sua operação precisa</h2>
            <p className="text-slate-600 font-medium">
              Desenvolvido sob medida para a rotina clínica de optometristas e a operação de balcão e crediário de óticas.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              id="modulos-consultorio"
              icon={<Eye size={28} />}
              badge="Consultório"
              titulo="Módulo Consultório & Exames"
              texto="Prontuário eletrônico completo com refração (OD/OE/Adição), acuidade visual, dioptrias e prescrição em PDF timbrado com assinatura."
              destaques={[
                "Refração diópter completa",
                "Receita em PDF timbrado",
                "Encaminhamento 1-clique para Ótica",
              ]}
            />
            <FeatureCard
              id="modulos-otica"
              icon={<Glasses size={28} />}
              badge="Ótica & OS"
              titulo="Módulo Ótica & Ordens de Serviço"
              texto="Emissão e controle completo de O.S., laboratório de montagem, controle de estoque de armações por grife e conferência de lentes."
              destaques={[
                "Status de OS em tempo real",
                "Estoque de armações por grife",
                "Rateio de margem e laboratório",
              ]}
            />
            <FeatureCard
              id="modulos-pupilometro"
              icon={<Ruler size={28} />}
              badge="Inovação"
              titulo="Pupilômetro Virtual por Câmera"
              texto="Medição de DNP/DP e altura vertical computadorizada diretamente pela webcam do PC ou câmera do tablet/smartphone."
              destaques={[
                "Medição sem aparelho físico",
                "Detecção automática de pupilas",
                "Arquivo auditável anexado à OS",
              ]}
            />
            <FeatureCard
              id="modulos-financeiro"
              icon={<CreditCard size={28} />}
              badge="Financeiro"
              titulo="Financeiro & Crediário Próprio"
              texto="Gestão de carnês de pagamento em PDF/impressão, controle de fluxo de caixa por conta corrente e relatório de inadimplência por rota."
              destaques={[
                "Gerador de Carnês em PDF",
                "Cobrança via WhatsApp",
                "Mapa de inadimplência por rota",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ATENDIMENTO ITINERANTE */}
      <section id="itinerante" className="overflow-hidden bg-slate-900 py-24 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 px-4 py-1.5 rounded-full border border-cyan-800/50">
              Operação Itinerante
            </span>
            <h2 className="mt-6 text-4xl font-black italic">Leve sua operação para onde o cliente estiver.</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300 font-medium">
              Gerencie agendas externas por cidade, realize exames itinerantes e venda com sincronização offline automática sem perder nenhuma Ordem de Serviço.
            </p>
            <ul className="mt-8 space-y-3 text-sm font-bold uppercase tracking-wide text-cyan-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-400" /> Roteirização por cidade e localidade
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-400" /> Exporte relatórios de atendimento em XLSX
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-400" /> Cobrança e avisos automáticos via WhatsApp
              </li>
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 p-8 text-center shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-900">Operação Itinerante Ativa</p>
            <p className="mt-4 text-6xl font-black text-white">32</p>
            <p className="mt-2 text-cyan-100 font-bold">Atendimentos externos agendados</p>
          </div>
        </div>
      </section>

      {/* CTA TESTE GRÁTIS */}
      <section id="cta" className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Pronto para escalar sua operação?</h2>
          <p className="mx-auto max-w-2xl text-slate-600 font-medium">
            Teste grátis por 7 dias. Sem cartão de crédito e com configuração instantânea de agendas, vendas e controle financeiro.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/cadastro"
              className="rounded-2xl bg-blue-600 px-10 py-4 text-lg font-black text-white shadow-xl shadow-blue-200 transition hover:scale-[1.02] hover:bg-blue-700"
            >
              Quero o OptoVendas Agora
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-10 py-4 text-lg font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Sparkles className="text-amber-500" size={20} /> Testar em Modo Demo
            </Link>
          </div>
        </div>
      </section>

      {/* RODAPÉ PROFISSIONAL COM LINKS FUNCIONAIS */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-600">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto%20(1).png"
                alt="OptoVendas"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              O ecossistema definitivo para a gestão de óticas, consultórios optométricos e operação itinerante.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Módulos do Sistema</h4>
            <ul className="space-y-2 text-xs font-bold text-slate-600">
              <li><a href="#modulos-consultorio" className="hover:text-blue-600 transition">Módulo Consultório & Exames</a></li>
              <li><a href="#modulos-otica" className="hover:text-blue-600 transition">Módulo Ótica & OS</a></li>
              <li><a href="#modulos-pupilometro" className="hover:text-blue-600 transition">Pupilômetro Virtual por Câmera</a></li>
              <li><a href="#modulos-financeiro" className="hover:text-blue-600 transition">Financeiro & Crediário Próprio</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Legal & Privacidade</h4>
            <ul className="space-y-2 text-xs font-bold text-slate-600">
              <li><Link href="/termos" className="hover:text-blue-600 transition">Termos de Uso do SaaS</Link></li>
              <li><Link href="/privacidade" className="hover:text-blue-600 transition">Política de Privacidade (LGPD)</Link></li>
              <li><Link href="/seguranca" className="hover:text-blue-600 transition">Segurança & Criptografia</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Contato & Suporte</h4>
            <p className="text-xs font-bold text-slate-700">Atendimento ao Cliente:</p>
            <p className="text-xs text-blue-600 font-black mt-1">suporte@optovendas.com.br</p>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">Segunda a Sexta, das 08h às 18h</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-xs font-bold text-slate-400">
          <p>© {new Date().getFullYear()} OptoVendas SaaS. Todos os direitos reservados.</p>
          <p className="mt-2 md:mt-0">Tecnologia para Optometristas e Óticas de Alta Performance</p>
        </div>
      </footer>
    </div>
  );
}
