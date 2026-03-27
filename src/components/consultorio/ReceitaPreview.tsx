"use client";

import React from 'react';
import { fmtNumber, fmtEixo, v } from '@/lib/refracaoFormat';

type Dados = any;
type Clinica = any;

export default function ReceitaPreview({ dados, clinica }: { dados: Dados; clinica: Clinica }) {
  const cor = clinica?.cor_primaria || '#0ea5a4';
  const paciente = dados.paciente_nome || (dados.pacientes?.nome_completo ?? 'Paciente');
  const idade = dados.idade_paciente || null;
  const data = dados.data_exame || new Date().toISOString().slice(0,10);

  const tratamentos = [dados.tratamento_lente, dados.tratamento_antirreflexo ? 'Anti Reflexo' : null, dados.tratamento_fotossivel ? 'Fotossensível' : null].filter(Boolean).join(' • ');

  return (
    <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-6" style={{ borderBottom: `4px solid ${cor}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black" style={{ color: cor }}>{clinica?.nome_fantasia || 'Clínica'}</h3>
            <p className="text-sm text-slate-500">{clinica?.endereco_completo || ''}</p>
          </div>
          {clinica?.logomarca_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={clinica.logomarca_url} alt="logo" className="w-28 object-contain" />
          ) : null}
        </div>
      </div>

      <div className="p-6">
        <div className="bg-slate-50 p-4 rounded-md mb-4">
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold">Nome Completo</div>
              <div className="text-lg font-black">{paciente}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-bold">Idade</div>
              <div className="text-lg font-black">{idade ?? '-'}</div>
              <div className="text-xs text-slate-400 mt-1">{data}</div>
            </div>
          </div>
        </div>

        <h4 className="text-center text-lg font-black uppercase tracking-wide mb-4">Prescrição de Óculos</h4>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs font-bold">
              <tr>
                <th className="p-3 text-left">Olho</th>
                <th className="p-3 text-center">Esférico</th>
                <th className="p-3 text-center">Cilíndrico</th>
                <th className="p-3 text-center">Eixo</th>
                <th className="p-3 text-center">AV</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 font-semibold">
              <tr className="border-t">
                <td className="p-3 font-black text-blue-600">OD</td>
                <td className="p-3 text-center">{fmtNumber(dados.od_esferico ?? dados.odEsferico)}</td>
                <td className="p-3 text-center">{fmtNumber(dados.od_cilindrico ?? dados.odCilindrico)}</td>
                <td className="p-3 text-center">{fmtEixo(dados.od_eixo ?? dados.odEixo)}</td>
                <td className="p-3 text-center">{v(dados.od_av ?? dados.odAv)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-black text-blue-600">OE</td>
                <td className="p-3 text-center">{fmtNumber(dados.oe_esferico ?? dados.oeEsferico)}</td>
                <td className="p-3 text-center">{fmtNumber(dados.oe_cilindrico ?? dados.oeCilindrico)}</td>
                <td className="p-3 text-center">{fmtEixo(dados.oe_eixo ?? dados.oeEixo)}</td>
                <td className="p-3 text-center">{v(dados.oe_av ?? dados.oeAv)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-md text-center">
            <div className="text-xs text-slate-500">Adição</div>
            <div className="font-black">{fmtNumber(dados.adicao ?? dados.adicao)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md text-center">
            <div className="text-xs text-slate-500">Tipo de Lente</div>
            <div className="font-black">{v(dados.tipo_lente)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md text-center">
            <div className="text-xs text-slate-500">Tratamento</div>
            <div className="font-black">{tratamentos || '-'}</div>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-500 italic">{v(dados.nota_rodape) || 'Válido por 6 meses.'}</div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            {clinica?.config_unidade?.carimbo_nome ? (
              <div className="inline-block rounded-md border-2 px-4 py-3 text-rose-700 bg-rose-50 font-black" style={{ borderColor: cor }}>
                <div className="uppercase">{clinica.config_unidade.carimbo_nome}</div>
                <div className="text-xs mt-1">{clinica.config_unidade.carimbo_titulo} • {clinica.config_unidade.carimbo_registro}</div>
              </div>
            ) : (
              <div>
                <div className="w-44 border-t mt-4" />
                <div className="text-xs font-bold mt-2">Assinatura do Profissional</div>
              </div>
            )}
          </div>

          <div className="text-right text-xs text-slate-500">{clinica?.endereco_completo || ''}</div>
        </div>
      </div>
    </div>
  );
}
