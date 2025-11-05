// frontend/src/lib/api.js
const BASE_RAW = import.meta.env.VITE_API_BASE ?? "";
const BASE = BASE_RAW.replace(/\/+$/, ""); // skini eventualne završne '/'

if (!BASE) {
  // Pomoćni hint u konzoli da vidiš šta je build “upio”
  // (u prod ćeš ovo vidjeti u browser devtools console)
  // Ako ovo ostane prazno, requesti će ići na frontend domen (loše u prod).
  console.warn("VITE_API_BASE is EMPTY. Requests will go to the same origin (/api...).");
}

async function doFetch(path, opts = {}) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}/api${p}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  // Ako backend vrati HTML (npr. SPA index), detektuj i baci jasan error
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON but got '${ct}'. URL=${url}\nSnippet: ${snippet.slice(0, 120)}`
    );
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export const apiFetch = doFetch;
export const apiGet = (path) => doFetch(path);
export const apiPost = (path, body) => doFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) => doFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) => doFetch(path, { method: "DELETE" });
