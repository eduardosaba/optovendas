import * as XLSX from "xlsx";

type CheckinRow = {
  nome: string;
  horario: string;
  compareceu: string;
};

export function exportarCheckinXlsx(
  nomeArquivo: string,
  cabecalho: {
    cidade: string;
    local: string;
    data: string;
    total: number;
    presentes: number;
  },
  rows: CheckinRow[],
) {
  const resumo = [
    ["Cidade", cabecalho.cidade],
    ["Local", cabecalho.local],
    ["Data", cabecalho.data],
    ["Total agendados", String(cabecalho.total)],
    ["Presentes", String(cabecalho.presentes)],
    ["Taxa presenca", cabecalho.total > 0 ? `${((cabecalho.presentes / cabecalho.total) * 100).toFixed(2)}%` : "0%"],
    [],
  ];

  const detalheHeader = [["Paciente", "Horario", "Status"]];
  const detalheRows = rows.map((r) => [r.nome, r.horario, r.compareceu]);

  const ws = XLSX.utils.aoa_to_sheet([...resumo, ...detalheHeader, ...detalheRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Checkin");
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}
