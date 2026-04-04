"use client";

import { Activity, MessageSquare, Users, History, CheckCircle2, Lock } from "lucide-react";

// Tipagem alinhada com as colunas do banco de dados
export type AnamneseValue = {
  motivoConsulta: string;
  antecedentesPessoais: string[];
  antecedentesFamiliares: string;
  motivosConsulta: string[];
  ultimoExame: string;
  usuarioOculos: string[];
  usaOculos: boolean;
  observacoesInternas?: string; // Novo campo
};

type Props = {
  value: AnamneseValue;
  onChange: (next: AnamneseValue) => void;
};

const OPCOES_ANTECEDENTES = ["Diabetes", "Hipertensão", "Glaucoma", "Catarata", "Alergias", "Ceratocone"];
const OPCOES_MOTIVOS = ["Dor ocular", "Cansaço visual", "Cefaleia", "Astenopia", "NDN - outros"];
const OPCOES_OCULOS = ["Óculos - Longe", "Óculos - Perto"];

export default function FichaAnamnese({ value, onChange }: Props) {
  
  function updateField<K extends keyof AnamneseValue>(key: K, next: any) {
    onChange({ ...value, [key]: next });
  }

  function toggleArrayItem(key: "antecedentesPessoais" | "motivosConsulta" | "usuarioOculos", item: string) {
    const currentArray = (value as any)[key] || [];
    const exists = currentArray.includes(item);
    const nextArray = exists
      ? currentArray.filter((i: string) => i !== item)
      : [...currentArray, item];
    updateField(key as any, nextArray);
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      
      {/* SEÇÃO: MOTIVO DA CONSULTA */}
      <section className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <MessageSquare className="text-blue-600" size={20} />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Motivo da Consulta</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {OPCOES_MOTIVOS.map((m) => (
            <TagButton 
              key={m} 
              label={m} 
              active={value.motivosConsulta.includes(m)} 
              onClick={() => toggleArrayItem("motivosConsulta", m)} 
            />
          ))}
        </div>

        <textarea
          id="motivo_consulta"
          name="motivo_consulta"
          aria-label="Motivo da consulta"
          value={value.motivoConsulta}
          onChange={(e) => updateField("motivoConsulta", e.target.value)}
          className="w-full bg-slate-50 border-none rounded-[32px] p-6 font-medium text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-500 h-32 transition-all italic placeholder:text-slate-300"
          placeholder="Descreva detalhadamente a queixa do paciente..."
        />

        <div className="pt-2">
          <label htmlFor="ultimo_exame" className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Último exame</label>
          <div className="flex items-center gap-3 mt-2 bg-slate-50 rounded-2xl p-2 pl-4">
            <History size={16} className="text-slate-400" />
            <input
              id="ultimo_exame"
              name="ultimo_exame"
              aria-label="Último exame"
              value={value.ultimoExame}
              onChange={(e) => updateField("ultimoExame", e.target.value)}
              placeholder="Ex: 6 meses atrás"
              className="bg-transparent border-none w-full font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300"
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO: ANTECEDENTES E USO DE ÓCULOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Antecedentes Pessoais */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <Activity className="text-rose-500" size={20} />
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Saúde Geral</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {OPCOES_ANTECEDENTES.map((item) => (
              <TagButton 
                key={item} 
                label={item} 
                active={(value.antecedentesPessoais || []).includes(item)} 
                onClick={() => toggleArrayItem("antecedentesPessoais", item)} 
                activeColor="bg-rose-500"
              />
            ))}
          </div>
        </div>

        {/* Usuário de Óculos */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Uso de Óculos</h3>
          </div>
          
          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => updateField("usaOculos", true)}
              aria-pressed={value.usaOculos}
              aria-label="Usa óculos - Sim"
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${value.usaOculos ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
            > Sim </button>
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, usaOculos: false, usuarioOculos: [] });
              }}
              aria-pressed={!value.usaOculos}
              aria-label="Usa óculos - Não"
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${!value.usaOculos ? "bg-white text-slate-600 shadow-sm" : "text-slate-400"}`}
            > Não </button>
          </div>

          {value.usaOculos && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2">
              {OPCOES_OCULOS.map((o) => (
                <TagButton 
                  key={o} 
                  label={o} 
                  active={(value.usuarioOculos || []).includes(o)} 
                  onClick={() => toggleArrayItem("usuarioOculos", o)} 
                  activeColor="bg-emerald-600"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO: ANTECEDENTES FAMILIARES */}
      <section className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Users className="text-purple-600" size={20} />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Histórico Familiar</h3>
        </div>
        <input
          id="antecedentes_familiares"
          name="antecedentes_familiares"
          aria-label="Antecedentes familiares"
          value={value.antecedentesFamiliares}
          onChange={(e) => updateField("antecedentesFamiliares", e.target.value)}
          className="w-full bg-slate-50 border-none rounded-[24px] p-5 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
          placeholder="Ex: Mãe com glaucoma, Pai diabético..."
        />
      </section>

      {/* NOVO: OBSERVAÇÕES INTERNAS (SIGILOSAS) */}
      <section className="bg-slate-900 p-8 rounded-[40px] shadow-xl space-y-4 border border-slate-800">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Lock className="text-amber-400" size={18} />
            <h3 className="text-xs font-black uppercase text-white/50 tracking-widest">Observações Clínicas (Sigiloso)</h3>
          </div>
          <span className="text-[9px] font-black uppercase text-amber-400/60 tracking-widest bg-amber-400/5 px-3 py-1 rounded-full border border-amber-400/20">Uso Interno</span>
        </div>
        <textarea
          id="observacoes_internas"
          name="observacoes_internas"
          aria-label="Observações internas"
          value={value.observacoesInternas || ""}
          onChange={(e) => updateField("observacoesInternas", e.target.value)}
          className="w-full bg-white/5 border-none rounded-[24px] p-6 font-medium text-slate-300 shadow-inner focus:ring-1 focus:ring-amber-500 h-28 transition-all text-sm placeholder:text-white/10"
          placeholder="Anote aqui detalhes técnicos, suspeitas ou informações que NÃO devem sair na receita impressa..."
        />
      </section>
    </div>
  );
}

function TagButton({ label, active, onClick, activeColor = "bg-blue-600" }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
        active 
        ? `${activeColor} text-white border-transparent shadow-lg scale-105` 
        : "bg-white text-slate-400 border-slate-100 hover:border-blue-200"
      }`}
    >
      {label}
    </button>
  );
}