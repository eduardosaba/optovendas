import Dexie from "dexie";

export interface PendingVenda {
  id?: number;
  venda: any;
  createdAt: string;
  syncPending: number; // 1 = pendente, 0 = sincronizado
}

export interface VendaOffline {
  id?: number;
  cliente_nome?: string;
  payload_venda?: any;
  foto_pupilometro?: Blob | string | null;
  foto_receita?: Blob | string | null;
  status: "pendente" | "sincronizado";
  criado_em: number;
}

export interface CatalogoProduto {
  id: string;
  nome: string;
  grife?: string | null;
  estoque?: number | null;
  preco?: number | null;
}

export interface TabelaPreco {
  id: string;
  nome: string;
  valor: number;
}

class OptoDB extends Dexie {
  vendasPendentes!: Dexie.Table<PendingVenda, number>;
  vendas_offline!: Dexie.Table<VendaOffline, number>;
  catalogo_produtos!: Dexie.Table<CatalogoProduto, string>;
  tabela_precos!: Dexie.Table<TabelaPreco, string>;

  constructor() {
    super("OptoVendasDB");

    // versão inicial (manter vendasPendentes para compatibilidade)
    this.version(1).stores({
      vendasPendentes: "++id, syncPending, createdAt",
    });

    // versao 2: adicionar tabelas para suporte offline rico
    this.version(2).stores({
      vendasPendentes: "++id, syncPending, createdAt",
      vendas_offline: "++id, status, criado_em",
      catalogo_produtos: "id, nome, grife, estoque",
      tabela_precos: "id, nome, valor",
    });

    this.vendasPendentes = this.table("vendasPendentes");
    this.vendas_offline = this.table("vendas_offline");
    this.catalogo_produtos = this.table("catalogo_produtos");
    this.tabela_precos = this.table("tabela_precos");
  }
}

export const db = new OptoDB();
