import { redirect } from "next/navigation";

export default function ClientesNovoRedirectPage() {
  redirect("/consultorio/pacientes/novo");
}
