"use client";

import { Activity, MessageSquare, Users, History, CheckCircle2 } from "lucide-react";

type AnamneseValue = {
  motivoConsulta: string;
  antecedentesPessoais: string[];
  antecedentesFamiliares: string;
  motivosConsulta: string[];
  ultimoExame: string;
  usuarioOculos: string[];
  usaOculos: boolean;
};

type Props = {
  value: AnamneseValue;
  onChange: (next: AnamneseValue) => void;
};

const OPCOES_ANTECEDENTES = ["Diabetes", "Hipertensão", "Glaucoma", "Catarata", "Alergias", "Ceratocone"];
const OPCOES_MOTIVOS = ["Dor ocular", "Cansaço visual", "Cefaleia", "Astenopia", "NDN - outros"];
const OPCOES_OCULOS = ["Óculos - Longe", "Óculos - Perto"];

export default function FichaAnamnese({ value, onChange }: Props) {
  function toggleAntecedente(item: string) {
    const existe = value.antecedentesPessoais.includes(item);
    const antecedentesPessoais = existe
      ? value.antecedentesPessoais.filter((i) => i !== item)
      : [...value.antecedentesPessoais, item];
    onChange({ ...value, antecedentesPessoais });
  }

  function toggleMotivo(item: string) {
    const existe = value.motivosConsulta.includes(item);
    const motivosConsulta = existe
      ? value.motivosConsulta.filter((i) => i !== item)
      : [...value.motivosConsulta, item];
    onChange({ ...value, motivosConsulta });
  }

  function toggleUsuarioOculos(item: string) {
    const existe = value.usuarioOculos.includes(item);
    const usuarioOculos = existe ? value.usuarioOculos.filter((i) => i !== item) : [...value.usuarioOculos, item];
    onChange({ ...value, usuarioOculos });
  }

  function setUsaOculos(flag: boolean) {
    onChange({ ...value, usaOculos: flag, usuarioOculos: flag ? value.usuarioOculos : [] });
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* SEÇÃO: MOTIVO DA CONSULTA */}
      <section className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <MessageSquare className="text-blue-600" size={20} />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Motivo da Consulta</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {OPCOES_MOTIVOS.map((m) => {
            const ativo = value.motivosConsulta.includes(m);
            return (
              <TagButton key={m} label={m} active={ativo} onClick={() => toggleMotivo(m)} />
            );
          })}
        </div>

        <textarea
          value={value.motivoConsulta}
          onChange={(e) => onChange({ ...value, motivoConsulta: e.target.value })}
          className="w-full bg-slate-50 border-none rounded-[32px] p-6 font-medium text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-500 h-32 transition-all italic placeholder:text-slate-300"
          placeholder="Descreva detalhadamente a queixa do paciente..."
        />

        <div className="pt-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Último exame</label>
          <div className="flex items-center gap-3 mt-2 bg-slate-50 rounded-2xl p-2 pl-4">
            <History size={16} className="text-slate-400" />
            <input
              value={value.ultimoExame}
              onChange={(e) => onChange({ ...value, ultimoExame: e.target.value })}
              placeholder="Ex: 6 meses atrás"
              className="bg-transparent border-none w-full font-bold text-slate-700 focus:ring-0"
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
                active={value.antecedentesPessoais.includes(item)} 
                onClick={() => toggleAntecedente(item)} 
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
              onClick={() => setUsaOculos(true)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${value.usaOculos ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
            > Sim </button>
            <button
              type="button"
              onClick={() => setUsaOculos(false)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${!value.usaOculos ? "bg-white text-slate-600 shadow-sm" : "text-slate-400"}`}
            > Não </button>
          </div>

          {value.usaOculos && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2">
              {OPCOES_OCULOS.map((o) => (
                <TagButton 
                  key={o} 
                  label={o} 
                  active={value.usuarioOculos.includes(o)} 
                  onClick={() => toggleUsuarioOculos(o)} 
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
          value={value.antecedentesFamiliares}
          onChange={(e) => onChange({ ...value, antecedentesFamiliares: e.target.value })}
          className="w-full bg-slate-50 border-none rounded-[24px] p-5 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
          placeholder="Ex: Mãe com glaucoma, Pai diabético..."
        />
      </section>
    </div>
  );
}

// Subcomponente de Tag para manter o código limpo
function TagButton({ label, active, onClick, activeColor = "bg-blue-600" }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
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