import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function CycleForm() {
  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [cycles, setCycles] = useState([]);
  const [msg, setMsg] = useState(null);
  const [termName, setTermName] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");

  async function fetchCycles() {
    try {
      const data = await apiGet("/api/cycles");
      setCycles(Array.isArray(data) ? data : []);
    } catch (e) {
      setCycles([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => { fetchCycles(); }, []);

  async function submitCycle(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        ...(dateStart ? { dateStart } : {}),
        ...(dateEnd ? { dateEnd } : {}),
      };
      await apiPost("/api/cycles", payload);
      setMsg({ type: "ok", text: "Cycle created" });
      setName(""); setDateStart(""); setDateEnd("");
      fetchCycles();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function addTerm(e) {
    e.preventDefault();
    setMsg(null);
    if (!selectedCycle) {
      setMsg({ type: "err", text: "Select cycle first" });
      return;
    }
    try {
      await apiPost(`/api/cycles/${selectedCycle}/terms`, {
        name: termName.trim(),
      });
      setMsg({ type: "ok", text: "Term added" });
      setTermName("");
      fetchCycles();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      <h2>Cycles</h2>

      <form onSubmit={submitCycle}>
        <div className="form-row">
          <input className="input" placeholder="2025/2026"
                 value={name} onChange={(e)=>setName(e.target.value)} required />
          <input type="date" className="input small"
                 value={dateStart} onChange={(e)=>setDateStart(e.target.value)} />
          <input type="date" className="input small"
                 value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} />
        </div>
        <button className="btn" type="submit">Create Cycle</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <h3>Add Term to Cycle</h3>
        <div className="form-row">
          <select className="input small"
                  value={selectedCycle}
                  onChange={(e)=>setSelectedCycle(e.target.value)}>
            <option value="">-- select cycle --</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input"
                 placeholder="Term name (Zimski semestar)"
                 value={termName} onChange={(e)=>setTermName(e.target.value)} />
          <button className="btn" onClick={addTerm}>Add Term</button>
        </div>
      </div>

      <h3>All Cycles</h3>
      {cycles.length === 0 ? (
        <div>[]</div>
      ) : (
        <div>
          {cycles.map(c => (
            <div key={c.id} style={{ marginBottom:12, padding:12, border:"1px solid #eee", borderRadius:8 }}>
              <strong>{c.name}</strong><br/>
              {c.dateStart ? `from ${new Date(c.dateStart).toLocaleDateString()}` : ""}{" "}
              {c.dateEnd ? `to ${new Date(c.dateEnd).toLocaleDateString()}` : ""}
              <div style={{ marginTop:8 }}>
                <em>Terms:</em>
                <ul>
                  {(c.terms || []).map(t => <li key={t.id}>{t.name}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
    </div>
  );
}
