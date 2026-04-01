"use client";

import { useRouter } from "next/navigation";
import ContaForm from "@/components/financeiro/ContaForm";
import { useToast } from "@/components/ui/ToastProvider";

export default function NovaContaPage() {
  const router = useRouter();
  const toast = useToast();

  async function handleSaved() {
    toast.success("Conta criada com sucesso.");
    router.push("/financeiro/contas");
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-[32px] border border-emerald-100 bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-black mb-4">Nova Conta Corrente</h1>
        <ContaForm initial={null} onSaved={handleSaved} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
