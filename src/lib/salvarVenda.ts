import { postJson } from "./api-client";
import { addPendingVenda } from "./syncQueue";

type SalvarOpts = {
  showToast?: (msg: string) => void;
};

export default async function salvarVenda(venda: any, opts: SalvarOpts = {}) {
  if (typeof window === "undefined") throw new Error("salvarVenda must be called in the browser");

  if (navigator.onLine) {
    return await postJson("/vendas", venda);
  } else {
    await addPendingVenda(venda);
    opts.showToast?.("Você está offline. A venda foi salva no aparelho e será enviada assim que houver sinal!");
    return { offlineSaved: true };
  }
}
