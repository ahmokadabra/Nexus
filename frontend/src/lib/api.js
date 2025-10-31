const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "omit" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `POST ${path} failed: ${res.status}`;
    try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
