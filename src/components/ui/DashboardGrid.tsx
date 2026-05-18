"use client";

import React from "react";

interface DashboardGridProps {
  children: React.ReactNode;
  cols?: 3 | 4 | 5;
  gap?: "gap-3" | "gap-4" | "gap-6" | "gap-8";
  className?: string;
}

/**
 * DashboardGrid - Componente reutilizável para layout responsivo de grids
 *
 * Centraliza toda a lógica de responsividade do sistema, garantindo consistência
 * visual em diferentes tamanhos de tela (mobile, tablet, desktop).
 *
 * @param cols - Número de colunas no desktop (3, 4 ou 5). Padrão: 5
 * @param gap - Espaçamento entre items (gap-3, gap-4, gap-6, gap-8). Padrão: gap-4
 * @param className - Classes adicionais customizadas
 *
 * Exemplos:
 * <DashboardGrid cols={5}> // Mobile: 1 col, Tablet: 2-3 cols, Desktop: 5 cols
 * <DashboardGrid cols={3}> // Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
 * <DashboardGrid cols={4} gap="gap-6"> // Com espaçamento maior
 */
export function DashboardGrid({
  children,
  cols = 5,
  gap = "gap-4",
  className = "",
}: DashboardGridProps) {
  // Mapeamento estratégico de Breakpoints para o Tailwind v4
  // Cada configuração foi otimizada para máxima legibilidade em cada breakpoint
  const gridVariants = {
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  };

  const gridClass = gridVariants[cols];

  return (
    <div className={`grid ${gridClass} ${gap} w-full ${className}`}>
      {children}
    </div>
  );
}
