// frontend/src/lib/api.js
const BASE =
  import.meta.env.VITE_API_BASE ||
  "https://nexus-backend-ijh0.onrender.com"; // ← tvoj backend

function makeUrl(path) {
  // path očekujemo npr. "/api/professors"
  const u = new URL(path, BASE);
  // cache-buster
  u.searchParams.set("_", Date.now().toString());
  return u.toString();
}

async function parseJsonOrThrow(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    // Ako nije JSON (npr. HTML od platforme), bacamo sadržaj
    throw new Error(`Non-JSON response: ${text.slice(0, 120)}...`);
  }
}

export async function apiGet(path) {
  const r = await fetch(makeUrl(path), {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
  });
  if (!r.ok) {
    const body = await parseJsonOrThrow(r).catch(() => null);
    const msg = body?.message || `${r.status} ${r.statusText}`;
    throw new Error(msg);
  }
  // garantirano JSON
  return parseJsonOrThrow(r);
}

export async function apiPost(path, body) {
  const r = await fetch(makeUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
  });
  if (!r.ok) {
    const body = await parseJsonOrThrow(r).catch(() => null);
    const msg = body?.message || `${r.status} ${r.statusText}`;
    throw new Error(msg);
  }
  return parseJsonOrThrow(r);
}
