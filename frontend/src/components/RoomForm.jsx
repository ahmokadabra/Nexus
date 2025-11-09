// frontend/src/components/RoomForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function RoomForm() {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);

  async function fetchList() {
    try {
      const data = await apiGet("/api/rooms");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => { fetchList(); }, []);

  function resetForm() {
    setName("");
    setShortCode("");
    setCapacity("");
    setIsOnline(false);
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const payload = {
      name: name.trim(),
      ...(shortCode ? { shortCode: shortCode.trim() } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      isOnline,
    };
    try {
      if (editingId) {
        await apiPut(`/api/rooms/${editingId}`, payload);
        setMsg({ type: "ok", text: "Updated" });
      } else {
        await apiPost("/api/rooms", payload);
        setMsg({ type: "ok", text: "Saved" });
      }
      resetForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  function onEdit(r) {
    setEditingId(r.id);
    setName(r.name || "");
    setShortCode(r.shortCode || "");
    setCapacity(r.capacity ?? "");
    setIsOnline(!!r.isOnline);
    setMsg(null);
  }

  async function onDelete(id) {
    if (!confirm("Delete this room?")) return;
    try {
      await apiDelete(`/api/rooms/${id}`);
      setMsg({ type: "ok", text: "Deleted" });
      if (editingId === id) resetForm();
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
            /> Online
          </label>
        </div>

        <div className="form-row" style={{ gap: 8 }}>
          <button className="btn" type="submit">
            {editingId ? "Update" : "Save"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Rooms</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Code</th><th>Capacity</th><th>Online</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="5">[]</td></tr>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.shortCode || "-"}</td>
                <td>{r.capacity ?? "-"}</td>
                <td>{r.isOnline ? "Yes" : "No"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn" type="button" onClick={() => onEdit(r)}>Edit</button>
                  <button className="btn" type="button" onClick={() => onDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
