// frontend/src/lib/api.js
const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() ||
  (typeof window !== "undefined" ? "" : "");

// Helper za spajanje putanje
const u = (path) => {
  if (!API_BASE) return path;
  return API_BASE.endsWith("/") ? API_BASE.slice(0, -1) + path : API_BASE + path;
};

export async function apiFetch(path, opts = {}) {
  const res = await fetch(u(path), {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let detail = "";
    try {
      if (ct.includes("application/json")) {
        const j = await res.json();
        detail = j.message || j.error || JSON.stringify(j);
      } else {
        detail = await res.text();
      }
    } catch {
      detail = res.statusText || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const apiGet    = (path)            => apiFetch(path);
export const apiPost   = (path, body)      => apiFetch(path, { method: "POST", body });
export const apiPut    = (path, body)      => apiFetch(path, { method: "PUT",  body });
export const apiDelete = (path)            => apiFetch(path, { method: "DELETE" });
