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
      <div
        className="card"
        style={{
          minWidth: 320,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Logo + naslov */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/logo.png"
            alt="Nexus logo"
            style={{ width: 120, height: "auto", marginBottom: 8 }}
          />
          <h2 style={{ margin: 0 }}>Prijava</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            width: "100%",
          }}
        >
          <div style={{ width: "100%", maxWidth: 320 }}>
            <label style={{ display: "block", textAlign: "left", marginBottom: 4 }}>
              Korisničko ime
            </label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div style={{ width: "100%", maxWidth: 320 }}>
            <label style={{ display: "block", textAlign: "left", marginBottom: 4 }}>
              Lozinka
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error" style={{ marginTop: 4, width: "100%", maxWidth: 320 }}>
              {error}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, width: "100%", maxWidth: 320 }}
          >
            {loading ? "Prijava..." : "Prijavi se"}
          </button>
        </form>
      </div>
    </div>
  );
}
