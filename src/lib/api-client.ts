import { supabase } from './supabase';

export async function postJson(path: string, body: any, opts: RequestInit = {}) {
  const url = path.startsWith("/") ? path : `/${path}`;

  // If running in the browser, try to attach the Supabase access token
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    if (typeof window !== 'undefined' && supabase?.auth?.getSession) {
      const sess = await supabase.auth.getSession();
      const token = (sess as any)?.data?.session?.access_token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  } catch {
    // ignore session read errors
  }

  const res = await fetch(url, {
    ...opts,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";

  // If the server didn't declare a JSON content-type, be defensive:
  // try to parse the body as JSON when possible (some proxies or errors
  // may strip headers). If parsing fails or response is not ok, surface
  // a helpful error.
  const text = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON despite content-type", { status: res.status, body: text });
      throw new Error(`Invalid JSON response from API (${res.status})`);
    }
  }

  // No JSON content-type: try to detect JSON body by heuristic
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length > 0) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!res.ok) {
        console.error("API returned error status with JSON body", { status: res.status, body: parsed });
        throw new Error(`API error ${res.status}: ${JSON.stringify(parsed).slice(0,200)}`);
      }
      return parsed;
    } catch (e) {
      console.error("API did not declare JSON and body is not valid JSON", { status: res.status, body: text });
      throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
    }
  }

  // Fallback: non-json body
  console.error("API did not return JSON", { status: res.status, body: text });
  throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
}
