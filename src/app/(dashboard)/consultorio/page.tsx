import Link from "next/link";

export default function ConsultorioPage() {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Modulo Consultorio</h2>
      <p className="mt-2 text-slate-600">Prontuario, exames e acompanhamento de pacientes.</p>
      <div className="mt-4 flex gap-4">
        <Link href="/consultorio/pacientes" className="text-cyan-700 underline underline-offset-4">
          Pacientes
        </Link>
        <Link
          href="/consultorio/atendimento/novo"
          className="text-cyan-700 underline underline-offset-4"
        >
          Novo atendimento clinico
        </Link>
      </div>
    </section>
  );
}
