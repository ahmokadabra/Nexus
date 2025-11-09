// frontend/src/components/RoomForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function RoomForm() {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState(""); // ⬅️ NOVO
  const [capacity, setCapacity] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  async function fetchList() {
    try {
      const data = await apiGet("/api/rooms");
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
        name: name.trim(),
        ...(shortCode ? { shortCode: shortCode.trim() } : {}), // ⬅️ NOVO
        ...(capacity ? { capacity: Number(capacity) } : {}),
        isOnline,
      };
      await apiPost("/api/rooms", payload);
      setMsg({ type: "ok", text: "Saved" });
      setName("");
      setShortCode(""); // ⬅️ NOVO
      setCapacity("");
      setIsOnline(false);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      <h2>Rooms</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input"
            placeholder="Name (Amfiteatar)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input small"
            placeholder="Code (AMF)"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
          />
          <input
            className="input small"
            placeholder="Capacity"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            inputMode="numeric"
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
            />{" "}
            Online
          </label>
        </div>
        <button className="btn" type="submit">
          Save
        </button>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Rooms</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Code</th><th>Capacity</th><th>Online</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="4">[]</td></tr>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.shortCode || "-"}</td>
                <td>{r.capacity ?? "-"}</td>
                <td>{r.isOnline ? "Yes" : "No"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
