import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientesEditarRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/consultorio/pacientes/novo?pacienteId=${id}`);
}
