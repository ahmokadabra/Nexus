const BASE = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "";

export async function apiFetch(path, opts = {}) {
  const url = `${BASE}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  // probaj pročitati JSON; ako je greška, prikaži smislen poruku
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    let msg = "Request failed";
    try {
      const parsed = JSON.parse(detail);
      msg = parsed.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}
