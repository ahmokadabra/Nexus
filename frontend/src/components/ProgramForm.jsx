// frontend/src/components/ProgramForm.jsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function ProgramForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [yearNumber, setYearNumber] = useState(1);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/programs");
      setPrograms(data);
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createProgram(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch("/programs", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
        }),
      });
      setMsg({ type: "ok", text: "Program created" });
      setName("");
      setCode("");
      load();
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Error" });
    }
  }

  async function addYear(e) {
    e.preventDefault();
    setMsg(null);
    if (!selectedProgram) {
      setMsg({ type: "err", text: "Select program" });
      return;
    }
    try {
      await apiFetch(`/programs/${selectedProgram}/years`, {
        method: "POST",
        body: JSON.stringify({ yearNumber: Number(yearNumber) }),
      });
      setMsg({ type: "ok", text: "Year added" });
      setYearNumber(1);
      load();
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Error" });
    }
  }

  return (
    <div>
      <h2>Programs (Study Programs)</h2>
      <form onSubmit={createProgram}>
        <div className="form-row">
          <input
            className="input"
            placeholder="Program name (Računarstvo)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input small"
            placeholder="Code (RI)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn" type="submit">Create Program</button>
        <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={load}>
          Refresh
        </button>
        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>
        )}
      </form>

      <h3 style={{ display: "inline-block", marginRight: 8 }}>Programs</h3>
      <small>{loading ? "Loading…" : `${programs.length} item(s)`}</small>

      <div style={{ marginTop: 8 }}>
        {programs.map((p) => (
          <div
            key={p.id}
            style={{ marginBottom: 12, padding: 12, border: "1px solid #eee", borderRadius: 8 }}
          >
            <strong>
              {p.name} {p.code ? `(${p.code})` : ""}
            </strong>
            <div>
              Years: {(p.years || []).map((y) => (
                <span key={y.id} style={{ marginRight: 8 }}>
                  Year {y.yearNumber}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 16 }}>Add year to program</h3>
      <div className="form-row">
        <select
          className="input small"
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
        >
          <option value="">-- select program --</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          className="input small"
          type="number"
          min={1}
          value={yearNumber}
          onChange={(e) => setYearNumber(e.target.value)}
        />
        <button className="btn" onClick={addYear}>Add Year</button>
      </div>
    </div>
  );
}
