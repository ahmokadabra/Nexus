import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function ProfessorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const data = await apiFetch("/professors");
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);

    const payload = {
      name: name.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };

    try {
      await apiFetch("/professors", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMsg({ type: "ok", text: "Saved" });
      setName(""); setEmail(""); setPhone("");
      fetchList();
    } catch (err) {
      setMsg({ type: "err", text: err?.message || "Error" });
    }
  }

  return (
    <div>
      <h2>Professors</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name"
                 value={name} onChange={e => setName(e.target.value)} required />
          <input className="input" placeholder="Email (optional)"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input small" placeholder="Phone (optional)"
                 value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button className="btn" type="submit">Save</button>
        <button type="button" className="btn" style={{marginLeft:8}} onClick={fetchList}>
          Refresh
        </button>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3 style={{display:"inline-block", marginRight:8}}>All Professors</h3>
      <small>{loading ? "Loading…" : `${list.length} item(s)`}</small>
      <table className="table" style={{marginTop:8}}>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email ?? "-"}</td>
              <td>{p.phone ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
