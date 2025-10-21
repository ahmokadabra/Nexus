import React, { useState, useEffect } from "react";

export default function RoomForm(){
  const [name,setName]=useState("");
  const [capacity,setCapacity]=useState("");
  const [isOnline,setIsOnline]=useState(false);
  const [list,setList]=useState([]);
  const [msg,setMsg]=useState(null);

  useEffect(()=>{ fetchList() },[]);
  async function fetchList(){ try { const res=await fetch("/api/rooms"); if(!res.ok) throw new Error(); setList(await res.json()); } catch(e){ setList([]); } }

  async function submit(e){
    e.preventDefault(); setMsg(null);
    try {
      const res = await fetch("/api/rooms", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name, capacity: capacity?Number(capacity):undefined, isOnline })
      });
      if(res.ok){ setMsg({type:"ok",text:"Saved"}); setName(""); setCapacity(""); setIsOnline(false); fetchList(); }
      else { const err = await res.json().catch(()=>({})); setMsg({type:"err",text:err.message||"Error"}); }
    } catch(err) { setMsg({type:"err",text:err.message}); }
  }

  return (
    <div>
      <h2>Rooms</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Name (A-101)" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input small" placeholder="Capacity" value={capacity} onChange={e=>setCapacity(e.target.value)} />
          <label style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="checkbox" checked={isOnline} onChange={e=>setIsOnline(e.target.checked)} /> Online
          </label>
        </div>
        <button className="btn" type="submit">Save</button>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Rooms</h3>
      <table className="table">
        <thead><tr><th>Name</th><th>Capacity</th><th>Online</th></tr></thead>
        <tbody>
          {list.map(r => (<tr key={r.id}><td>{r.name}</td><td>{r.capacity||"-"}</td><td>{r.isOnline? "Yes":"No"}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
