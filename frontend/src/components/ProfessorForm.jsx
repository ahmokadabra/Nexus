import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function ProfessorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");   // optional
  const [phone, setPhone] = useState("");   // optional
  const [msg, setMsg] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const data = await apiGet("/api/professors");
      // osiguraj da je niz
      setList(Array.isArray(data) ? data : []);
      setMsg(null);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message || "Failed to load" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/professors", {
        name,
        email: email || undefined,
        phone: phone || undefined,
      });
      setMsg({ type: "ok", text: "Saved" });
      setName("");
      setEmail("");
      setPhone("");
      await fetchList(); // obavezno refetch
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Error" });
    }
  }

  return (
    <div>
      <h2>Professors</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input small"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button className="btn" type="submit">Save</button>
        <button
          type="button"
          className="btn"
          style={{ marginLeft: 8 }}
          onClick={fetchList}
        >
          Refresh
        </button>
        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"}>
            {msg.text}
          </div>
        )}
      </form>

      <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        All Professors {loading ? <small>(loading...)</small> : null}
      </h3>

      <table className="table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ opacity: 0.7 }}>
                (no data)
              </td>
            </tr>
          ) : (
            list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
