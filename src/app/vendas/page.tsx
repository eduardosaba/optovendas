import Link from "next/link";

function FeatureCard({ icon, titulo, texto }: { icon: string; titulo: string; texto: string }) {
  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500 hover:shadow-xl">
      <div className="mb-5 text-4xl transition group-hover:scale-110">{icon}</div>
      <h3 className="mb-3 text-xl font-black text-slate-900">{titulo}</h3>
      <p className="leading-relaxed text-slate-600">{texto}</p>
    </article>
  );
}

export default function VendasPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#dbeafe,transparent_35%),radial-gradient(circle_at_85%_0%,#bae6fd,transparent_30%),#f8fafc] text-slate-900">
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/vendas" className="text-2xl font-black tracking-tight text-blue-600">OptoVendas</Link>
          <div className="hidden gap-8 text-sm font-semibold text-slate-700 md:flex">
            <a href="#funcionalidades" className="transition hover:text-blue-600">Funcionalidades</a>
            <a href="#itinerante" className="transition hover:text-blue-600">Atendimento Externo</a>
            <a href="#cta" className="transition hover:text-blue-600">Teste Grátis</a>
          </div>
          <Link href="/login" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700">Área do Cliente</Link>
        </div>
      </nav>

      <section className="px-6 pb-24 pt-36">
        <div className="mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-2">
          <div>
            <span className="rounded-full bg-blue-100 px-4 py-1 text-xs font-black uppercase tracking-wide text-blue-700">SaaS para Optometristas</span>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] md:text-7xl">
              Clínica, ótica e financeiro em <span className="text-blue-600">um único painel</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Troque planilhas por previsibilidade. Organize prontuários, ordens de serviço, crediário e operação itinerante com foco total em faturamento.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/cadastro" className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-black text-white transition hover:bg-blue-700">
                Começar Teste Grátis
              </Link>
              <Link href="/admin/dashboard" className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50">
                Ver Demonstração
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-cyan-200/70 blur-2xl" />
            <div className="absolute -right-6 bottom-6 h-44 w-44 rounded-full bg-blue-300/60 blur-2xl" />
            <div className="relative rotate-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="-rotate-2 rounded-2xl bg-slate-900 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Dashboard Diário</p>
                <p className="mt-3 text-3xl font-black">R$ 18.470</p>
                <p className="text-sm text-slate-300">Faturamento da semana</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-400">Consultas</p>
                    <p className="text-xl font-black">32</p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-400">OS Prontas</p>
                    <p className="text-xl font-black">9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-14 text-center text-3xl font-black uppercase tracking-tight">Tudo que você precisa</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon="👁️"
              titulo="O ecossistema definitivo para o seu consultório."
              texto="Prontuário eletrônico completo com histórico inteligente e prescrição digital em PDF. Tudo o que você precisa em uma única plataforma."
            />
            <FeatureCard
              icon="👓"
              titulo="Gestão Inteligente para Óticas."
              texto="Gestão completa de O.S. integrada à prescrição. Tenha um controle rigoroso do laboratório e logística de entrega setorizada para garantir a satisfação do seu cliente."
            />
            <FeatureCard
              icon="💰"
              titulo="Gestão Estratégica de Crédito Próprio."
              texto="Facilite o pagamento para seus clientes com parcelamento no carnê e tenha uma visão clara do seu fluxo de caixa. Monitore a inadimplência em tempo real e automatize suas cobranças."
            />
          </div>
        </div>
      </section>

      <section id="itinerante" className="overflow-hidden bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-black italic">Leve sua operação para onde o cliente estiver.</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Chega de perder tempo com rotas mal planejadas. Com o OptoVendas, você gerencia agendas externas por cidade, faz check-in das visitas e converte mais via WhatsApp com dados em tempo real.
            </p>
            <ul className="mt-8 space-y-3 text-sm font-bold uppercase tracking-wide text-cyan-300">
              <li>Roteirização por localidade: Ganhe produtividade no deslocamento.</li>
              <li>Gestão de Visitas (XLSX): Exporte dados de check-in para planilhas em um clique.</li>
              <li>WhatsApp Integrado: Comunique-se com seus clientes de forma organizada.</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 p-8 text-center shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-900">Operação Itinerante</p>
            <p className="mt-4 text-5xl font-black text-white">32</p>
            <p className="mt-2 text-cyan-100">Atendimentos previstos na semana</p>
          </div>
        </div>
      </section>

      <section id="cta" className="px-6 py-20 text-center">
        <h2 className="text-4xl font-black">Pronto para escalar sua operação?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">Teste grátis hoje mesmo. Sem burocracia, sem cartão e com configuração instantânea de agenda, vendas e fluxo de caixa.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/cadastro" className="rounded-2xl bg-blue-600 px-10 py-4 text-lg font-black text-white shadow-xl transition hover:scale-[1.02] hover:bg-blue-700">
            Quero o OptoVendas Agora
          </Link>
          <Link href="/login" className="rounded-2xl border border-slate-300 bg-white px-10 py-4 text-lg font-bold text-slate-800 transition hover:bg-slate-50">
            Já sou cliente
          </Link>
        </div>
      </section>
    </div>
  );
}
