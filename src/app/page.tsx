import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between p-6">
        <h1 className="text-3xl font-extrabold text-blue-600">OptoVendas</h1>
        <div className="flex gap-3">
          <Link
            href="/cadastro"
            className="rounded-full border border-blue-200 px-5 py-2 font-medium text-blue-700 hover:bg-blue-50"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
          >
            Entrar no Sistema
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="mb-6 text-5xl font-bold text-slate-900 md:text-6xl">
          A inteligencia que seu <span className="text-blue-600">consultorio</span> merece.
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-600">
          Gerencie atendimentos optometricos, emita laudos funcionais e controle vendas e crediario em um unico lugar.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="w-64 rounded-xl border p-6 shadow-sm transition hover:shadow-md">
            <span className="text-3xl">Consultorio</span>
            <h3 className="mt-4 font-bold">Consultorio Full</h3>
            <p className="text-sm text-slate-500">Prontuarios, anamnese e laudos tecnicos completos.</p>
          </div>
          <div className="w-64 rounded-xl border p-6 shadow-sm transition hover:shadow-md">
            <span className="text-3xl">Otica</span>
            <h3 className="mt-4 font-bold">Otica Integrada</h3>
            <p className="text-sm text-slate-500">Venda vinculada a receita e controle de OS.</p>
          </div>
          <div className="w-64 rounded-xl border p-6 shadow-sm transition hover:shadow-md">
            <span className="text-3xl">Financeiro</span>
            <h3 className="mt-4 font-bold">Financeiro</h3>
            <p className="text-sm text-slate-500">Crediario proprio e controle completo de caixa.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
