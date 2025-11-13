// frontend/src/lib/api.js

// ✅ Pametan default za Render: ako je frontend na *.onrender.com, a baza URL-a nije zadana,
// koristimo backend domen: nexus-backend-ijh0.onrender.com
const DEFAULT_BASE =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("onrender.com") &&
  !/backend/i.test(window.location.hostname)
    ? "https://nexus-backend-ijh0.onrender.com"
    : "";

// Prioritet: VITE_API_BASE (build time) -> window.__API_BASE__ (runtime) -> DEFAULT_BASE
const RAW_BASE = String(
  (import.meta?.env?.VITE_API_BASE ?? (typeof window !== "undefined" ? window.__API_BASE__ : "") ?? DEFAULT_BASE) || ""
).trim();

// Normalizovan API base (bez trailing slash)
export const apiBase = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

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
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData);

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

// ✅ XLSX downloader
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
