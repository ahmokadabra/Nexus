// frontend/src/lib/api.js

// Bira backend bazu:
// - prvo iz Vite env-a (VITE_API_BASE)
// - onda iz window.__API_BASE__ ako postoji
// - fallback: isti origin (npr. "/api/...").
const RAW_BASE =
  (import.meta?.env?.VITE_API_BASE ?? window.__API_BASE__ ?? "").trim();

const apiBase = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

// Sastavi pun URL za API rutu
export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return apiBase ? `${apiBase}${p}` : p;
}

// Generički fetch sa JSON-om i greškama
export async function apiFetch(path, options = {}) {
  const url = apiUrl(path);
  const isJsonBody =
    options.body && typeof options.body === "object" && !(options.body instanceof FormData);

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: isJsonBody ? JSON.stringify(options.body) : options.body,
  });

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {}
    const msg = payload?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const apiGet = (p) => apiFetch(p, { method: "GET" });
export const apiPost = (p, body) => apiFetch(p, { method: "POST", body });
export const apiPut = (p, body) => apiFetch(p, { method: "PUT", body });
export const apiDelete = (p) => apiFetch(p, { method: "DELETE" });

// ✅ XLSX downloader (OVO je falilo u tvom build-u)
export async function downloadXlsx(path, filename = "data.xlsx") {
  const url = apiUrl(path);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
