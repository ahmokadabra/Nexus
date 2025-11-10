import React from "react";

// male inline SVG ikonice (bez dodatnih libova)
const IconDB = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);
const IconPlan = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconLoad = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M4 12h10M4 18h6" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconSchedule = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconLibrary = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 19h16M6 19V5a2 2 0 0 1 2-2h1v16M15 19V3h1a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export default function Sidebar({ active, onSelect }) {
  const btnStyle = (isActive) => ({
    width: 56, height: 56, borderRadius: 12, display: "grid", placeItems: "center",
    border: "1px solid #e5e7eb",
    background: isActive ? "#eef2ff" : "#fff",
    color: isActive ? "#4338ca" : "#374151",
    cursor: "pointer"
  });

  const wrap = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 8, borderRight: "1px solid #eee" };

  return (
    <aside style={wrap}>
      <button title="Početna" style={btnStyle(active === null)} onClick={() => onSelect(null)}>
        {/* logo smanjeno u sidebaru */}
        <img src="/logo.svg" alt="Nexus" style={{ width: 22, height: "auto" }} />
      </button>

      <button title="Baza podataka" style={btnStyle(active === "db")} onClick={() => onSelect("db")}>
        <IconDB />
      </button>

      <button title="Plan realizacije" style={btnStyle(active === "plan")} onClick={() => onSelect("plan")}>
        <IconPlan />
      </button>

      <button title="Opterećenje nastavnika" style={btnStyle(active === "opterećenje")} onClick={() => onSelect("opterećenje")}>
        <IconLoad />
      </button>

      <button title="Raspored nastave" style={btnStyle(active === "raspored")} onClick={() => onSelect("raspored")}>
        <IconSchedule />
      </button>

      <button title="Biblioteka" style={btnStyle(active === "biblioteka")} onClick={() => onSelect("biblioteka")}>
        <IconLibrary />
      </button>
    </aside>
  );
}
