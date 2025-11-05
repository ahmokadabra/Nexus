import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function ProgramForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [yearNumber, setYearNumber] = useState(1);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchPrograms(); }, []);

  async function fetchPrograms() {
    try {
      const data = await apiGet("/api/programs");
      setPrograms(data);
    } catch {
      setPrograms([]);
    }
  }

  async function createProgram(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/programs", {
        name,
        code: code || undefined
      });
      setMsg({ type: "ok", text: "Program created" });
      setName("");
      setCode("");
      fetchPrograms();
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
      await apiPost(`/api/programs/${selectedProgram}/years`, {
        yearNumber: Number(yearNumber)
      });
      setMsg({ type: "ok", text: "Year added" });
      setYearNumber(1);
      fetchPrograms();
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
      </form>

      <h3>Add year to program</h3>
      <div className="form-row">
        <select
          className="input small"
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
        >
          <option value="">-- select program --</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
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

      <h3>Programs</h3>
      <div>
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

      {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
    </div>
  );
}
