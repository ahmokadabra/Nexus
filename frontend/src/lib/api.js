// frontend/src/lib/api.js
const RAW_BASE = import.meta.env.VITE_API_BASE?.trim();
function normalizeBase(u) {
  if (!u) return "";
  return u.endsWith("/") ? u.slice(0, -1) : u;
}
const API_BASE = normalizeBase(RAW_BASE) || "";
// Exponuj bazu za brzu provjeru u konzoli (prod ok)
if (typeof window !== "undefined") window.APP_DEBUG_BASE = API_BASE;

function timeoutFetch(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
    clearTimeout(id)
  );
}

async function handle(res) {
  const ct = res.headers.get("content-type") || "";
  // Ako nije JSON, pokušaj pročitati text radi dijagnostike
  if (!ct.includes("application/json")) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON but got '${ct}'. URL=${res.url} Snippet: ${snippet.slice(0, 120)}`
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await timeoutFetch(url, { credentials: "omit" });
  return handle(res);
}

export async function apiPost(path, body) {
  const url = `${API_BASE}${path}`;
  const res = await timeoutFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const url = `${API_BASE}${path}`;
  const res = await timeoutFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const url = `${API_BASE}${path}`;
  const res = await timeoutFetch(url, { method: "DELETE" });
  return handle(res);
}
