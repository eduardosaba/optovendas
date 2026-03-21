"use client";

type AnamneseValue = {
  motivoConsulta: string;
  antecedentesPessoais: string[];
  antecedentesFamiliares: string;
};

type Props = {
  value: AnamneseValue;
  onChange: (next: AnamneseValue) => void;
};

const OPCOES_ANTECEDENTES = [
  "Diabetes",
  "Hipertensao",
  "Glaucoma",
  "Catarata",
  "Alergias",
  "Cerceamento",
];

export default function FichaAnamnese({ value, onChange }: Props) {
  function toggleAntecedente(item: string) {
    const existe = value.antecedentesPessoais.includes(item);
    const antecedentesPessoais = existe
      ? value.antecedentesPessoais.filter((i) => i !== item)
      : [...value.antecedentesPessoais, item];

    onChange({ ...value, antecedentesPessoais });
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <h3 className="border-b pb-2 text-lg font-bold text-blue-700">1. Anamnese</h3>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block font-medium">Motivo da Consulta</label>
          <textarea
            value={value.motivoConsulta}
            onChange={(e) => onChange({ ...value, motivoConsulta: e.target.value })}
            className="h-20 w-full rounded border p-2"
            placeholder="Ex: Cefaleia ao final do dia, visao embacada para longe..."
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Antecedentes Pessoais</label>
          <div className="flex flex-wrap gap-2">
            {OPCOES_ANTECEDENTES.map((item) => {
              const ativo = value.antecedentesPessoais.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAntecedente(item)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    ativo ? "bg-blue-100 text-blue-800" : "bg-gray-100 hover:bg-blue-50"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block font-medium">Antecedentes Familiares</label>
          <input
            value={value.antecedentesFamiliares}
            onChange={(e) => onChange({ ...value, antecedentesFamiliares: e.target.value })}
            className="w-full rounded border p-2"
            placeholder="Ex: Pai com Glaucoma, Mae miope..."
          />
        </div>
      </div>
    </div>
  );
}
