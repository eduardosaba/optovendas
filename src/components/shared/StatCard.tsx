"use client";

import React from "react";

type Props = {
  label: string;
  value: string | number;
  trend?: string;
  icon?: React.ReactNode;
  color?: "emerald" | "rose" | "amber" | "blue" | "indigo";
  empty?: boolean;
};

export default function StatCard({ label, value, trend, icon, color = "emerald", empty = false }: Props) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  if (empty) {
    return (
      <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all h-40 flex flex-col justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="flex items-center justify-between">
          <div className="text-sm italic text-slate-400">Sem dados no período</div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{trend}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all h-40 flex flex-col justify-between">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 mb-4">{value}</h3>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{trend}</span>
      </div>
    </div>
  );
}
