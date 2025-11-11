// frontend/src/components/SubjectForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, downloadXlsx } from "../lib/api";

export default function SubjectForm() {
  // add form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ects, setEcts] = useState("");

  // programi i godine (učitavamo programe sa njihovim years)
  const [programs, setPrograms] = useState([]); // [{id,name,years:[{id,yearNumber}]}]
  const [selectedPY, setSelectedPY] = useState(new Set()); // set(programYearId)

  // list + UI
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // search / sort / pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("code"); // code|name|ects
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // inline edit
  const [editId, setEditId] = useState(null);
  const [eCode, setECode] = useState("");
  const [eName, setEName] = useState("");
  const [eEcts, setEEcts] = useState("");
  const [eSelectedPY, setESelectedPY] = useState(new Set());

  async function fetchPrograms() {
    try {
      const data = await apiGet("/api/programs"); // očekuje { id, name, years: [{id, yearNumber}] }
      const shaped = (Array.isArray(data) ? data : []).map((p) => ({
        id: p.id,
        name: p.name,
        years: (p.years || []).map((y) => ({ id: y.id, yearNumber: y.yearNumber })),
      }));
      setPrograms(shaped);
    } catch (e) {
      setPrograms([]);
    }
  }

  async function fetchList() {
    try {
      const data = await apiGet("/api/subjects");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => {
    fetchPrograms();
    fetchList();
  }, []);

  function resetAdd() {
    setCode("");
    setName("");
    setEcts("");
    setSelectedPY(new Set());
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        ...(ects ? { ects: Number(ects) } : { ects: null }),
        programYearIds: Array.from(selectedPY),
      };
      await apiPost("/api/subjects", payload);
      setMsg({ type: "ok", text: "Saved" });
      resetAdd();
      fetchList();
    } catch (e2) {
      setMsg({ type: "err", text: e2.message });
    }
  }

  function togglePY(setter, currentSet, id) {
    const next = new Set(currentSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function startEdit(s) {
    setEditId(s.id);
    setECode(s.code || "");
    setEName(s.name || "");
    setEEcts(s.ects ?? "");
    const sel = new Set(
      (s.onProgramYears || []).map((op) => op.programYearId)
    );
    setESelectedPY(sel);
  }
  function cancelEdit() {
    setEditId(null);
  }
  async function saveEdit(id) {
    try {
      const payload = {
        code: eCode.trim(),
        name: eName.trim(),
        ...(eEcts !== "" ? { ects: Number(eEcts) } : { ects: null }),
        programYearIds: Array.from(eSelectedPY),
      };
      await apiPut(`/api/subjects/${id}`, payload);
      setEditId(null);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/subjects/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // search/sort/paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const programsTag = (s.onProgramYears || [])
        .map((op) => `${op.programYear.program.name} ${op.programYear.yearNumber}`)
        .join(" ");
      const bag = [
        s.code || "",
        s.name || "",
        String(s.ects ?? ""),
        programsTag,
      ]
        .join(" ")
        .toLowerCase();
      return bag.includes(q);
    });
  }, [list, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const get = (obj) => {
        if (sortKey === "ects") return obj.ects ?? 0;
        if (sortKey === "name") return (obj.name || "").toLowerCase();
        return (obj.code || "").toLowerCase();
      };
      const va = get(a), vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function onDownload() {
    setMsg(null);
    try {
      await downloadXlsx("/api/subjects/export.xlsx", "predmeti.xlsx");
    } catch (e) {
      setMsg({ type: "err", text: `Download nije uspio: ${e.message}` });
    }
  }

  // helpers za prikaz program/year taga
  function tagsForSubject(s) {
    return (s.onProgramYears || [])
      .map((op) => `${op.programYear.program.name} — Year ${op.programYear.yearNumber}`)
      .join(", ");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Subjects</h2>
        <div className="form-row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Pretraga…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={onDownload}>Download XLSX</button>
        </div>
      </div>

      {/* ADD */}
      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input small"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input small"
            placeholder="ECTS"
            value={ects}
            onChange={(e) => setEcts(e.target.value)}
            inputMode="numeric"
          />
        </div>

        {/* Programi + godine (checkbox-evi po programima i njihovim godinama) */}
        <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
          {programs.map((p) => (
            <div key={p.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 10 }}>
              <strong>{p.name}</strong>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                {(p.years || []).map((y) => (
                  <label key={y.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={selectedPY.has(y.id)}
                      onChange={() => togglePY(setSelectedPY, selectedPY, y.id)}
                    />
                    Godina {y.yearNumber}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="btn" type="submit" style={{ marginTop: 10 }}>Save</button>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Subjects</h3>
      <table className="table">
        <thead>
          <tr>
            <th onClick={() => toggleSort("code")} style={{ cursor: "pointer" }}>
              Code {sortKey === "code" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>
              Name {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th onClick={() => toggleSort("ects")} style={{ cursor: "pointer" }}>
              ECTS {sortKey === "ects" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Programs/Years</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr><td colSpan="5">[]</td></tr>
          ) : pageItems.map((s) => {
            const isEditing = editId === s.id;
            return (
              <tr key={s.id}>
                {isEditing ? (
                  <>
                    <td><input className="input small" value={eCode} onChange={(e) => setECode(e.target.value)} /></td>
                    <td><input className="input" value={eName} onChange={(e) => setEName(e.target.value)} /></td>
                    <td><input className="input small" value={eEcts} onChange={(e) => setEEcts(e.target.value)} inputMode="numeric" /></td>
                    <td>
                      {/* inline izmjena program/godina */}
                      <div style={{ display: "grid", gap: 6 }}>
                        {programs.map((p) => (
                          <div key={p.id}>
                            <strong>{p.name}</strong>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                              {(p.years || []).map((y) => (
                                <label key={y.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    checked={eSelectedPY.has(y.id)}
                                    onChange={() => togglePY(setESelectedPY, eSelectedPY, y.id)}
                                  />
                                  Y{y.yearNumber}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" onClick={() => saveEdit(s.id)}>Save</button>{" "}
                      <button className="btn" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{s.code}</td>
                    <td>{s.name}</td>
                    <td>{s.ects ?? "-"}</td>
                    <td>{tagsForSubject(s) || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" onClick={() => startEdit(s)}>Edit</button>{" "}
                      <button className="btn" onClick={() => onDelete(s.id)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button className="btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {safePage} / {totalPages}</span>
        <button className="btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
      </div>
    </div>
  );
}
