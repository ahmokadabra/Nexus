// frontend/src/components/Sidebar.jsx
import React from "react";

function DatabaseIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" stroke={active ? "currentColor" : "#777"} strokeWidth="2" fill="none"/>
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke={active ? "currentColor" : "#777"} strokeWidth="2" fill="none"/>
    </svg>
  );
}
function PlanIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M7 14h5M7 17h8" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
    </svg>
  );
}
function LoadIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 21h18" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M6 21V10l6-6 6 6v11" stroke={active ? "currentColor" : "#777"} strokeWidth="2" fill="none"/>
      <path d="M10 21v-6h4v6" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
    </svg>
  );
}
function ScheduleIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <circle cx="15" cy="15" r="3" stroke={active ? "currentColor" : "#777"} strokeWidth="2" fill="none"/>
      <path d="M15 15l2 1" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
    </svg>
  );
}
function LibraryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2z" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M10 3h4a2 2 0 012 2v16h-6V3z" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
      <path d="M18 21V7h2a1 1 0 011 1v12a1 1 0 01-1 1h-2z" stroke={active ? "currentColor" : "#777"} strokeWidth="2"/>
    </svg>
  );
}

const items = [
  { key: "db",   label: "Baza podataka",       Icon: DatabaseIcon },
  { key: "plan", label: "Plan realizacije",    Icon: PlanIcon },
  { key: "load", label: "Opterećenje",         Icon: LoadIcon },
  { key: "sched",label: "Raspored nastave",    Icon: ScheduleIcon },
  { key: "lib",  label: "Biblioteka",          Icon: LibraryIcon },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar">
      {items.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            className={`side-item ${isActive ? "active" : ""}`}
            onClick={() => onSelect(key)}
            title={label}
          >
            <Icon active={isActive} />
            <span>{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
