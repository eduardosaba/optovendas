"use client";

import React from "react";
import { Info } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  trend?: string;
  icon?: React.ReactNode;
  color?: "emerald" | "rose" | "amber" | "blue" | "indigo";
  empty?: boolean;
  hint?: string;
};

export default function StatCard({ label, value, trend, icon, color = "emerald", empty = false, hint }: Props) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  if (empty) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between min-h-[150px] overflow-hidden">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 truncate">{label}</p>
        <div className="flex items-center justify-between">
          <div className="text-xs italic text-slate-400">Sem dados no período</div>
          {icon && <div className={`p-2 rounded-xl shrink-0 ${colors[color]}`}>{icon}</div>}
        </div>
        {trend && <div className="mt-2"><span className="text-[10px] font-bold text-slate-400 uppercase truncate">{trend}</span></div>}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between min-h-[150px] overflow-hidden group">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{label}</p>
          {hint && (
            <div className="relative group/hint shrink-0">
              <Info size={13} className="text-slate-400" />
              <div className="pointer-events-none opacity-0 group-hover/hint:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-900 text-white text-[11px] rounded-lg p-2 shadow-lg z-50">
                {hint}
              </div>
            </div>
          )}
        </div>
        {icon && <div className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${colors[color]}`}>{icon}</div>}
      </div>

      <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight my-1 truncate whitespace-nowrap">
        {value}
      </h3>

      {trend && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{trend}</span>
        </div>
      )}
    </div>
  );
}
