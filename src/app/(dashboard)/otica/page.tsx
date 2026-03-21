import Link from "next/link";

export default function OticaPage() {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Modulo Otica</h2>
      <p className="mt-2 text-slate-600">Add-on para vendas, ordem de servico e entrega.</p>
      <div className="mt-4">
        <Link href="/otica/vendas/nova" className="font-semibold text-cyan-700 underline underline-offset-4">
          Abrir Nova Venda / OS
        </Link>
      </div>
      <div className="mt-2">
        <Link href="/otica/os" className="font-semibold text-cyan-700 underline underline-offset-4">
          Abrir Torre de Controle de OS
        </Link>
      </div>
    </section>
  );
}
