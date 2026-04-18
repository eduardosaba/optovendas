import Link from "next/link";

export default function BloqueadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-extrabold mb-4">Acesso Bloqueado</h1>
        <p className="text-slate-600 mb-6">O acesso a esta conta está temporariamente bloqueado devido ao status ou expiração da clínica.</p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-md bg-blue-600 px-4 py-2 text-white font-bold">Voltar ao Login</Link>
          <a href="mailto:repsys.suporte@gmail.com" className="rounded-md border px-4 py-2 font-bold">Contactar suporte</a>
        </div>
      </div>
    </div>
  );
}
