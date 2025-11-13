// frontend/src/components/ProgramForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function ProgramForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [yearNumber, setYearNumber] = useState(1);

  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState("");
  const [eCode, setECode] = useState("");

  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchPrograms() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet("/api/programs");
      setPrograms(Array.isArray(data) ? data : []);
    } catch (e) {
      setPrograms([]);
      setMsg({ type: "error", text: e.message || "Failed to load programs." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPrograms(); }, []);

  async function createProgram(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/programs", { name, code: code || undefined });
      setMsg({ type: "ok", text: "Program kreiran" });
      setName(""); setCode("");
      fetchPrograms();
    } catch (e2) {
      setMsg({ type: "error", text: e2.message || "Greška pri kreiranju" });
    }
  }

  async function addYear(e) {
    e.preventDefault();
    setMsg(null);
    if (!selectedProgram) return setMsg({ type: "error", text: "Odaberi program" });
    try {
      await apiPost(`/api/programs/${selectedProgram}/years`, {
        yearNumber: Number(yearNumber),
      });
      setMsg({ type: "ok", text: "Godina dodana" });
      setYearNumber(1);
      fetchPrograms();
    } catch (e2) {
      setMsg({ type: "error", text: e2.message || "Greška pri dodavanju godine" });
    }
  }

  function startEdit(p) {
    setEditId(p.id);
    setEName(p.name || "");
    setECode(p.code || "");
  }
  function cancelEdit() {
    setEditId(null);
    setEName("");
    setECode("");
  }
  async function saveEdit(id) {
    setMsg(null);
    try {
      const payload = {
        ...(eName.trim() ? { name: eName.trim() } : {}),
        // dozvoli brisanje koda -> pošalji null ako je prazno
        ...(eCode !== undefined ? { code: eCode.trim() || null } : {}),
      };
      await apiPut(`/api/programs/${id}`, payload);
      setMsg({ type: "ok", text: "Sačuvano" });
      cancelEdit();
      fetchPrograms();
    } catch (e2) {
      setMsg({ type: "error", text: e2.message || "Greška pri snimanju" });
    }
  }

  async function deleteYear(programId, year) {
    setMsg(null);
    try {
      await apiDelete(`/api/programs/${programId}/years/${year}`);
      setMsg({ type: "ok", text: "Godina obrisana" });
      fetchPrograms();
    } catch (e2) {
      setMsg({ type: "error", text: e2.message || "Greška pri brisanju godine" });
    }
  }

  async function deleteProgram(id) {
    if (!confirm("Obrisati program?")) return;
    setMsg(null);
    try {
      await apiDelete(`/api/programs/${id}`);
      setMsg({ type: "ok", text: "Program obrisan" });
      if (selectedProgram === id) setSelectedProgram("");
      fetchPrograms();
    } catch (e2) {
      setMsg({ type: "error", text: e2.message || "Greška pri brisanju" });
    }
  }

  return (
    <div>
      <div className="form-header">
        <h2>Studijski programi</h2>
        <button className="btn" onClick={fetchPrograms} disabled={loading}>
          {loading ? "Učitavanje..." : "Osvježi"}
        </button>
      </div>

      {/* Kreiraj program */}
      <form onSubmit={createProgram}>
        <div className="form-row">
          <input
            className="input"
            placeholder="Naziv programa (npr. Računarstvo i informatika)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="input small"
            placeholder="Šifra (npr. RI)"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
        </div>
        <button className="btn" type="submit">Kreiraj program</button>
      </form>

      {/* Dodaj godinu */}
      <h3 style={{ marginTop: 16 }}>Dodaj godinu programu</h3>
      <div className="form-row">
        <select
          className="input small"
          value={selectedProgram}
          onChange={e => setSelectedProgram(e.target.value)}
        >
          <option value="">— odaberi program —</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.code ? ` (${p.code})` : ""}
            </option>
          ))}
        </select>
        <input
          className="input small"
          type="number"
          min={1}
          max={10}
          value={yearNumber}
          onChange={e => setYearNumber(e.target.value)}
        />
        <button className="btn" onClick={addYear}>Dodaj godinu</button>
      </div>

      {/* Lista + inline edit */}
      <h3 style={{ marginTop: 16 }}>Programi</h3>
      {loading && programs.length === 0 ? (
        <div className="hint">Učitavanje…</div>
      ) : programs.length === 0 ? (
        <div className="hint">Nema programa.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {programs.map(p => (
            <div
              key={p.id}
              className="card"
              style={{ display: "grid", gap: 8 }}
            >
              {editId === p.id ? (
                <>
                  <div className="form-row">
                    <input
                      className="input"
                      value={eName}
                      onChange={e => setEName(e.target.value)}
                      placeholder="Naziv"
                    />
                    <input
                      className="input small"
                      value={eCode}
                      onChange={e => setECode(e.target.value)}
                      placeholder="Šifra (npr. RI)"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => saveEdit(p.id)}>Save</button>
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                    <strong>{p.name} {p.code ? `(${p.code})` : ""}</strong>
                    <div style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" onClick={() => startEdit(p)}>Edit</button>{" "}
                      <button className="btn" onClick={() => deleteProgram(p.id)}>Delete</button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontWeight: 600 }}>Godine:</span>{" "}
                    {(p.years || []).length ? (
                      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        {p.years.map(y => (
                          <span
                            key={y.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "2px 8px",
                              border: "1px solid #3a4152",
                              borderRadius: 999,
                              fontSize: 13
                            }}
                          >
                            {y.yearNumber}. g.
                            <button
                              type="button"
                              className="btn"
                              onClick={() => deleteYear(p.id, y.yearNumber)}
                              title="Obriši godinu"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ opacity: .7 }}>—</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className={msg.type === "ok" ? "success" : "error"} style={{ marginTop: 8 }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
