export type LastUserLogo = {
  email: string;
  nome?: string | null;
  fotoUrl?: string | null;
};

export const LAST_USER_LOGO_KEY = "optovendas:login:lastUserLogo";

export function readLastUserLogo(): LastUserLogo | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LAST_USER_LOGO_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LastUserLogo;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastUserLogo(value: LastUserLogo) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_USER_LOGO_KEY, JSON.stringify(value));
}
