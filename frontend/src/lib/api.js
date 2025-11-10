// frontend/src/lib/api.js

// 1) Odredi bazni URL backend-a na siguran način (prod + dev)
const FALLBACK_BACKEND =
  typeof window !== "undefined" && location.hostname.endsWith("onrender.com")
    ? "https://nexus-backend-ijh0.onrender.com" // 👈 tvoj Render backend URL
    : "http://localhost:3001";

export const API_BASE = (
  import.meta.env?.VITE_API_BASE ||        // prefer .env.production/.env.development
  (typeof window !== "undefined" && window.__API_BASE__) || // eventualno global
  FALLBACK_BACKEND
).replace(/\/+$/, ""); // bez završnog '/'

export function apiUrl(path = "") {
  const p = String(path || "");
  return p.startsWith("http") ? p : `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
}

// Generičan fetch helper
async function request(method, path, body) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body
      ? { "Content-Type": "application/json", Accept: "application/json" }
      : { Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Ako Render vrati index.html umjesto JSON-a, ovdje bacamo jasan error
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (isJson) {
      const j = await res.json().catch(() => null);
      if (j?.message) msg += ` – ${j.message}`;
    } else {
      const t = await res.text().catch(() => "");
      if (t?.startsWith("<!doctype html")) msg += " (dobijen HTML umjesto JSON-a – provjeri VITE_API_BASE)";
    }
    throw new Error(msg);
  }
  return isJson ? res.json() : res.text();
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiPut = (path, body) => request("PUT", path, body);
export const apiDelete = (path) => request("DELETE", path);

// Za eksplicitne downloade (XLSX, CSV, PDF…)
export function apiDownload(path, filename = "download.bin") {
  return fetch(apiUrl(path)).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });
}
