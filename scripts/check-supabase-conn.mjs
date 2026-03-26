const url = "https://ggpjfyejksxphmzdscro.supabase.co/rest/v1/config_sistema?select=nome_sistema,versao,logo_url,cor_primaria&id=eq.1";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGpmeWVqa3N4cGhtemRzY3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODU3MDYsImV4cCI6MjA4OTY2MTcwNn0.rNrnPbf4F3g32X7F_r8k0VhBGWgSyd98BstCrdKJLec";

(async () => {
  try {
    const res = await fetch(url, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });

    console.log('status:', res.status);
    const text = await res.text();
    try {
      console.log('json:', JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log('body (text):', text.slice(0, 4000));
    }
  } catch (err) {
    console.error('fetch error:', err);
  }
})();
