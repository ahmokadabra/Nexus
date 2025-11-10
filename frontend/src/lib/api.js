// frontend/src/lib/api.js

// Base URL for the backend API (set in .env.* as VITE_API_BASE)
// Example: VITE_API_BASE="https://nexus-backend-ijh0.onrender.com"
const API_BASE = import.meta.env.VITE_API_BASE || "";

// Join base + path safely
export function apiUrl(path) {
  if (!path) return API_BASE || "/";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

// Unified response handler: JSON if possible, otherwise text; throws on !ok
async function handle(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch (_) {
      // ignore JSON parse errors; keep default msg
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export async function apiGet(path) {
  const res = await fetch(apiUrl(path), { method: "GET" });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(apiUrl(path), { method: "DELETE" });
  return handle(res);
}

// ⬇️ NEW: helper for downloading XLSX files
export async function downloadXlsx(path, filename = "data.xlsx") {
  const res = await fetch(apiUrl(path), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // release object URL shortly after click
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}
