import { supabase } from "@/lib/supabase";

type BackupSnapshot = {
  meta: {
    clinica_id: string;
    data_exportacao: string;
    versao: string;
  };
  dados: Record<string, unknown[]>;
};

const TABELAS_BACKUP = [
  "pacientes",
  "anamnese",
  "receitas_optometricas",
  "laudos_funcionais",
  "vendas",
  "ordens_servico",
  "payments",
  "installments",
  "fluxo_caixa",
  "contas_a_pagar",
  "conta_corrente",
  "categorias_financeiras",
] as const;

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function toCSV(rows: unknown[]): string {
  if (!rows.length) return "";
  const recordRows = rows as Record<string, unknown>[];
  const headers = Object.keys(recordRows[0]);

  const escape = (v: unknown) => {
    const raw = v === null || v === undefined ? "" : String(v);
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const lines = [headers.map(escape).join(",")];
  for (const row of recordRows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function coletarDadosClinica(clinicaId: string): Promise<BackupSnapshot> {
  const resultados = await Promise.all(
    TABELAS_BACKUP.map(async (tabela) => {
      let query = supabase.from(tabela).select("*");
      if (tabela === "categorias_financeiras") {
        query = query.or(`clinica_id.eq.${clinicaId},clinica_id.is.null`);
      } else {
        query = query.eq("clinica_id", clinicaId);
      }
      const { data, error } = await query;
      if (error) throw new Error(`${tabela}: ${error.message}`);
      return [tabela, (data ?? []) as unknown[]] as const;
    }),
  );

  return {
    meta: {
      clinica_id: clinicaId,
      data_exportacao: new Date().toISOString(),
      versao: "optovendas-backup-v1",
    },
    dados: Object.fromEntries(resultados),
  };
}

export async function exportarClinicaJSON(clinicaId: string) {
  const snapshot = await coletarDadosClinica(clinicaId);
  const ts = Date.now();
  downloadBlob(
    `backup_optovendas_${clinicaId}_${ts}.json`,
    JSON.stringify(snapshot, null, 2),
    "application/json",
  );
}

export async function exportarClinicaCSV(clinicaId: string) {
  const snapshot = await coletarDadosClinica(clinicaId);
  const ts = Date.now();

  for (const [tabela, rows] of Object.entries(snapshot.dados)) {
    const csv = toCSV(rows);
    downloadBlob(`backup_${clinicaId}_${tabela}_${ts}.csv`, csv, "text/csv;charset=utf-8;");
  }
}
