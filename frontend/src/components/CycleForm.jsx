import React, { useState, useEffect } from "react";

export default function CycleForm(){
  const [name,setName]=useState("");
  const [dateStart,setDateStart]=useState("");
  const [dateEnd,setDateEnd]=useState("");
  const [cycles,setCycles]=useState([]);
  const [msg,setMsg]=useState(null);
  const [termName,setTermName]=useState("");
  const [selectedCycle,setSelectedCycle]=useState(null);

  useEffect(()=>{ fetchCycles() },[]);
  async function fetchCycles(){ try { const res=await fetch("/api/cycles"); if(!res.ok) throw new Error(); setCycles(await res.json()); } catch(e){ setCycles([]); } }

  async function submitCycle(e){
    e.preventDefault(); setMsg(null);
    try {
      const res = await fetch("/api/cycles", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name, dateStart: dateStart || undefined, dateEnd: dateEnd || undefined })
      });
      if(res.ok){ setMsg({type:"ok",text:"Cycle created"}); setName(""); setDateStart(""); setDateEnd(""); fetchCycles(); }
      else { const err = await res.json().catch(()=>({})); setMsg({type:"err",text:err.message||"Error"}); }
    } catch(err) { setMsg({type:"err",text:err.message}); }
  }

  async function addTerm(e){
    e.preventDefault(); setMsg(null);
    if(!selectedCycle){ setMsg({type:"err",text:"Select cycle first"}); return; }
    try {
      const res = await fetch(`/api/cycles/${selectedCycle}/terms`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: termName })
      });
      if(res.ok){ setMsg({type:"ok",text:"Term added"}); setTermName(""); fetchCycles(); }
      else { const err = await res.json().catch(()=>({})); setMsg({type:"err",text:err.message||"Error"}); }
    } catch(err) { setMsg({type:"err",text:err.message}); }
  }

  return (
    <div>
      <h2>Cycles</h2>
      <form onSubmit={submitCycle}>
        <div className="form-row">
          <input className="input" placeholder="2025/2026" value={name} onChange={e=>setName(e.target.value)} required />
          <input type="date" className="input small" value={dateStart} onChange={e=>setDateStart(e.target.value)} />
          <input type="date" className="input small" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} />
        </div>
        <button className="btn" type="submit">Create Cycle</button>
      </form>

      <div style={{marginTop:12}}>
        <h3>Add Term to Cycle</h3>
        <div className="form-row">
          <select className="input small" value={selectedCycle||""} onChange={e=>setSelectedCycle(e.target.value)}>
            <option value="">-- select cycle --</option>
            {cycles.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="Term name (Zimski semestar)" value={termName} onChange={e=>setTermName(e.target.value)} />
          <button className="btn" onClick={addTerm}>Add Term</button>
        </div>
      </div>

      <h3>All Cycles</h3>
      <div>
        {cycles.map(c => (
          <div key={c.id} style={{marginBottom:12, padding:12, border:"1px solid #eee", borderRadius:8}}>
            <strong>{c.name}</strong><br/>
            {c.dateStart ? `from ${new Date(c.dateStart).toLocaleDateString()}` : ""} {c.dateEnd ? `to ${new Date(c.dateEnd).toLocaleDateString()}` : ""}
            <div style={{marginTop:8}}>
              <em>Terms:</em>
              <ul>
                {(c.terms||[]).map(t => <li key={t.id}>{t.name}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
      {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
    </div>
  );
}
