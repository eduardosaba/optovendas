import Dexie from "dexie";

export interface PendingVenda {
  id?: number;
  venda: any;
  createdAt: string;
  syncPending: boolean;
}

class OptoDB extends Dexie {
  vendasPendentes!: Dexie.Table<PendingVenda, number>;

  constructor() {
    super("OptoVendasDB");
    this.version(1).stores({
      vendasPendentes: "++id, syncPending, createdAt",
    });
    this.vendasPendentes = this.table("vendasPendentes");
  }
}

export const db = new OptoDB();
