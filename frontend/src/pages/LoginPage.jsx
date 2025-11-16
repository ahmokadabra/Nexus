// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Neuspješna prijava");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onLogin?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        color: "var(--text)",
      }}
    >
      <div className="card" style={{ minWidth: 320, padding: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, textAlign: "center" }}>
          Prijava u Nexus
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label>
            <div style={{ marginBottom: 4 }}>Korisničko ime</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            <div style={{ marginBottom: 4 }}>Lozinka</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="error" style={{ marginTop: 4 }}>
              {error}
            </div>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Prijava..." : "Prijavi se"}
          </button>
        </form>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Ako nemaš admin korisnika, otvori backend URL{" "}
          <code>/api/auth/seed-admin</code> da kreiraš inicijalnog admina
          (username: <b>admin</b>, lozinka: <b>admin123</b>).
        </div>
      </div>
    </div>
  );
}
