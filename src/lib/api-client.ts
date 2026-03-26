export async function postJson(path: string, body: any, opts: RequestInit = {}) {
  const url = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
    ...opts,
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok || !contentType.includes("application/json")) {
    const text = await res.text();
    // Log the HTML or error body to console for debugging (will appear in client)
    console.error("API did not return JSON", { status: res.status, body: text });
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}
