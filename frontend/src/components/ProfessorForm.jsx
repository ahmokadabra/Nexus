import React, { useState, useEffect } from "react";

export default function ProfessorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState(null);
  const [list, setList] = useState([]);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      const res = await fetch("/api/professors");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setList(data);
    } catch {
      setList([]);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });
      if (res.ok) {
        setMsg({ type: "ok", text: "Saved" });
        setName(""); setEmail(""); setPhone("");
        fetchList();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: err.message || "Error" });
      }
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  }

  return (
    <div>
      <h2>Professors</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
          <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input small" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button className="btn" type="submit">Save</button>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
        <tbody>
          {list.map(p => (<tr key={p.id}><td>{p.name}</td><td>{p.email || "-"}</td><td>{p.phone || "-"}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
