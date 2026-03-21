import Link from "next/link";

export default function FinanceiroPage() {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Modulo Financeiro</h2>
      <p className="mt-2 text-slate-600">Fluxo de caixa, crediario e inadimplencia por localidade.</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/financeiro/dashboard" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
          Dashboard Financeiro
        </Link>
        <Link href="/financeiro/receber" className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
          Receber (Baixa Rapida)
        </Link>
        <Link href="/financeiro/pagar" className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
          Contas a Pagar
        </Link>
        <Link href="/financeiro/parcelas" className="rounded bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-800">
          Lista de Parcelas
        </Link>
      </div>
    </section>
  );
}
