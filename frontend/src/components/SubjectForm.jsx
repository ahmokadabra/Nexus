import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function SubjectForm() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ects, setEcts] = useState("");
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

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
    fetchList();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      };
      if (ects.trim() !== "") payload.ects = Number(ects);

      await apiPost("/api/subjects", payload);

      setMsg({ type: "ok", text: "Saved" });
      setCode("");
      setName("");
      setEcts("");
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      <h2>Subjects</h2>

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
        <button className="btn" type="submit">Save</button>
        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"}>
            {msg.text}
          </div>
        )}
      </form>

      <h3>All Subjects</h3>
      <table className="table">
        <thead>
          <tr><th>Code</th><th>Name</th><th>ECTS</th></tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="3">[]</td></tr>  /* “dvije zagrade” */
          ) : (
            list.map((s) => (
              <tr key={s.id}>
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>{s.ects ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
