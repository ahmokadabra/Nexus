// frontend/src/lib/api.js
const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

export async function apiFetch(path, opts = {}) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}/api${p}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      // nije JSON, ignore
    }
    throw new Error(msg);
  }

  // 204/no body fallback
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Helperi radi kompatibilnosti sa komponentama
export const apiGet = (path) => apiFetch(path);
export const apiPost = (path, body) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) =>
  apiFetch(path, { method: "DELETE" });
