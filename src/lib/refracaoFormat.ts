export function fmtNumber(input: unknown) {
  if (input === null || input === undefined) return "-";
  const s = String(input).trim();
  if (s === "") return "-";
  const n = Number(s.toString().replace(/,/g, "."));
  if (!Number.isFinite(n)) return s;
  const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

export function fmtEixo(input: unknown) {
  if (input === null || input === undefined) return "-";
  const s = String(input).trim();
  if (s === "") return "-";
  const n = Number(s.toString().replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(n)) return `${s}°`;
  return `${n}°`;
}

export function v(input: unknown) {
  if (input === null || input === undefined) return "-";
  const txt = String(input).trim();
  return txt.length ? txt : "-";
}

export function maskAv(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";

  // Suporte para visão de perto no formato J1..J6
  const jMatch = s.match(/[Jj]\s*([1-6])/);
  if (jMatch) return `J${jMatch[1]}`;

  // Formatação padrão para visão de longe (20/20)
  const digits = s.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}
