export const COMBOS_OTICA = [
  {
    id: 'combo_prata_multifocal_ar',
    nome: 'Combo Prata - Multifocal AR',
    categoria_armacao: 'Standard',
    tipo_lente: 'Multifocal AR',
    preco_final: 599.0,
    limite_armacao: 250.0,
  },
  {
    id: 'combo_ouro_multifocal_foto',
    nome: 'Combo Ouro - Multifocal Foto',
    categoria_armacao: 'Premium',
    tipo_lente: 'Multifocal Foto',
    preco_final: 1190.0,
    limite_armacao: 500.0,
  },
  {
    id: 'combo_vs_ar',
    nome: 'Combo VS - Visão Simples AR',
    categoria_armacao: 'Standard',
    tipo_lente: 'VS AR',
    preco_final: 299.0,
    limite_armacao: 150.0,
  },
];

export type Combo = typeof COMBOS_OTICA[number];
