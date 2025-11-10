import React from "react";

// male inline SVG ikonice
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
  const itemStyle = (isActive) => ({
    width: 88,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    gap: 6,
    padding: "10px 8px",
    border: "1px solid var(--border)",
    background: isActive ? "#111827" : "transparent",
    color: isActive ? "var(--accent)" : "var(--text)",
    cursor: "pointer"
  });

  const wrap = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRight: "1px solid var(--border)",
    background: "#0a1020"
  };

  const Item = ({ id, label, Icon, isLogo }) => (
    <button
      style={itemStyle(active === id)}
      onClick={() => onSelect(id)}
      title={label}
    >
      {isLogo ? (
        <img
          src="/logo.svg"
          alt="Nexus"
          style={{ width: 24, height: 24, objectFit: "contain" }}
          onError={(e)=>{ e.currentTarget.style.display="none"; }}
        />
      ) : (<Icon />)}
      <span style={{ fontSize: 11, color: active === id ? "var(--accent)" : "var(--muted)", textAlign:"center", lineHeight:1.1 }}>
        {label}
      </span>
    </button>
  );

  return (
    <aside style={wrap}>
      <Item id={null} label="Početna" Icon={IconDB} isLogo />
      <Item id="db" label="Baza podataka" Icon={IconDB} />
      <Item id="plan" label="Plan realizacije" Icon={IconPlan} />
      <Item id="opterećenje" label="Opterećenje nastavnika" Icon={IconLoad} />
      <Item id="raspored" label="Raspored nastave" Icon={IconSchedule} />
      <Item id="biblioteka" label="Biblioteka" Icon={IconLibrary} />
    </aside>
  );
}
