// frontend/src/lib/api.js
const BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  (typeof window !== "undefined" ? `${window.location.origin}` : "");

async function handle(res) {
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  if (!res.ok) {
    const msg =
      (isJson && (body.message || body.error)) ||
      (typeof body === "string" && body) ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = body;
    throw err;
  }
  return body;
}

export function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${BASE}${path}`;
}

export async function apiGet(path) {
  const res = await fetch(apiUrl(path), { credentials: "omit" });
  return handle(res);
}

export async function apiPost(path, data) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data ?? {}),
  });
  return handle(res);
}

export async function apiPut(path, data) {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data ?? {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(apiUrl(path), { method: "DELETE" });
  return handle(res);
}
