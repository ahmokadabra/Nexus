// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

function getToken() {
  return localStorage.getItem("token") || "";
}

export default function AdminPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "USER",
    canDB: true,
    canPlan: true,
    canTeacherLoad: true,
    canSchedule: true,
    canLibrary: true,
  });

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Greška pri dohvaćanju korisnika");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Greška pri kreiranju korisnika");
      }
      const u = await res.json();
      setUsers((prev) =>
        [...prev, u].sort((a, b) => a.username.localeCompare(b.username))
      );
      setNewUser({
        username: "",
        password: "",
        role: "USER",
        canDB: true,
        canPlan: true,
        canTeacherLoad: true,
        canSchedule: true,
        canLibrary: true,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateUser(id, patch) {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Greška pri ažuriranju korisnika");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Administracija korisnika</h2>

      {error && (
        <div className="error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Dodaj novog korisnika</h3>
        <form
          onSubmit={createUser}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div>
            <div>Korisničko ime</div>
            <input
              className="input"
              value={newUser.username}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, username: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <div>Lozinka</div>
            <input
              className="input"
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, password: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <div>Uloga</div>
            <select
              className="input"
              value={newUser.role}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, role: e.target.value }))
              }
            >
              <option value="USER">Korisnik</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 13,
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={newUser.canDB}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, canDB: e.target.checked }))
                }
              />{" "}
              Baza podataka
            </label>
            <label>
              <input
                type="checkbox"
                checked={newUser.canPlan}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, canPlan: e.target.checked }))
                }
              />{" "}
              Plan realizacije
            </label>
            <label>
              <input
                type="checkbox"
                checked={newUser.canTeacherLoad}
                onChange={(e) =>
                  setNewUser((u) => ({
                    ...u,
                    canTeacherLoad: e.target.checked,
                  }))
                }
              />{" "}
              Opterećenje nastavnika
            </label>
            <label>
              <input
                type="checkbox"
                checked={newUser.canSchedule}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, canSchedule: e.target.checked }))
                }
              />{" "}
              Raspored
            </label>
            <label>
              <input
                type="checkbox"
                checked={newUser.canLibrary}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, canLibrary: e.target.checked }))
                }
              />{" "}
              Biblioteka
            </label>
          </div>
          <button className="btn" type="submit">
            Dodaj korisnika
          </button>
        </form>
      </section>

      <section>
        <h3>Postojeći korisnici</h3>
        {loading ? (
          <div>Učitavanje...</div>
        ) : users.length === 0 ? (
          <div>Nema korisnika.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Korisnik</th>
                <th>Uloga</th>
                <th>Baza</th>
                <th>Plan</th>
                <th>Opterećenje</th>
                <th>Raspored</th>
                <th>Biblioteka</th>
                <th>Nova lozinka</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onUpdate={updateUser} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function UserRow({ user, onUpdate }) {
  const [password, setPassword] = useState("");

  function toggle(field) {
    onUpdate(user.id, { [field]: !user[field] });
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!password) return;
    await onUpdate(user.id, { password });
    setPassword("");
  }

  return (
    <tr>
      <td>{user.username}</td>
      <td>
        <select
          className="input small"
          value={user.role}
          onChange={(e) => onUpdate(user.id, { role: e.target.value })}
        >
          <option value="USER">Korisnik</option>
          <option value="ADMIN">Admin</option>
        </select>
      </td>
      <td>
        <input
          type="checkbox"
          checked={user.canDB}
          onChange={() => toggle("canDB")}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={user.canPlan}
          onChange={() => toggle("canPlan")}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={user.canTeacherLoad}
          onChange={() => toggle("canTeacherLoad")}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={user.canSchedule}
          onChange={() => toggle("canSchedule")}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={user.canLibrary}
          onChange={() => toggle("canLibrary")}
        />
      </td>
      <td>
        <form
          onSubmit={changePassword}
          style={{ display: "flex", gap: 4, alignItems: "center" }}
        >
          <input
            className="input small"
            type="password"
            placeholder="Nova lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!password}>
            Spasi
          </button>
        </form>
      </td>
    </tr>
  );
}
