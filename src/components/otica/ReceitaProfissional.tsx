import React from 'react';

export const ReceitaProfissional = ({ dados }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <div className="bg-slate-900 p-3 text-white text-center text-[9px] font-black uppercase tracking-widest">Prescrição de Lentes</div>
    <table className="w-full text-center">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/50 text-[8px] font-black uppercase text-slate-400">
          <th className="py-2">OLHO</th>
          <th>ESFÉRICO</th>
          <th>CILÍNDRICO</th>
          <th>EIXO</th>
          <th>DNP</th>
        </tr>
      </thead>
      <tbody className="text-xs font-bold text-slate-700 dark:text-slate-200">
        <tr className="border-b border-slate-50 dark:border-slate-800">
          <td className="py-3 text-blue-600 font-black">OD</td>
          <td>{dados.od_esf}</td>
          <td>{dados.od_cil}</td>
          <td>{dados.od_eixo}°</td>
          <td>{dados.dnp_dir}</td>
        </tr>
        <tr>
          <td className="py-3 text-blue-600 font-black">OE</td>
          <td>{dados.oe_esf}</td>
          <td>{dados.oe_cil}</td>
          <td>{dados.oe_eixo}°</td>
          <td>{dados.dnp_esq}</td>
        </tr>
      </tbody>
    </table>
    {dados.adicao && (
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-center text-[10px] font-black text-blue-600 uppercase">Adição: {dados.adicao}</div>
    )}
  </div>
);

export default ReceitaProfissional;
