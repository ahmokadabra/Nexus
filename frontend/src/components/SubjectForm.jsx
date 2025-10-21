import React, { useState, useEffect } from "react";

export default function SubjectForm(){
  const [code,setCode]=useState("");
  const [name,setName]=useState("");
  const [ects,setEcts]=useState("");
  const [list,setList]=useState([]);
  const [msg,setMsg]=useState(null);

  useEffect(()=>{ fetchList() },[]);

  async function fetchList(){ try { const res=await fetch("/api/subjects"); if(!res.ok) throw new Error(); setList(await res.json()); } catch(e){ setList([]); } }

  async function submit(e){
    e.preventDefault(); setMsg(null);
    try {
      const res = await fetch("/api/subjects", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ code, name, ects: ects?Number(ects):undefined })
      });
      if(res.ok){ setMsg({type:"ok",text:"Saved"}); setCode(""); setName(""); setEcts(""); fetchList(); }
      else { const err = await res.json().catch(()=>({})); setMsg({type:"err",text:err.message||"Error"}); }
    } catch(err) { setMsg({type:"err",text:err.message}); }
  }

  return (
    <div>
      <h2>Subjects</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input small" placeholder="Code" value={code} onChange={e=>setCode(e.target.value)} required />
          <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input small" placeholder="ECTS" value={ects} onChange={e=>setEcts(e.target.value)} />
        </div>
        <button className="btn" type="submit">Save</button>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Subjects</h3>
      <table className="table">
        <thead><tr><th>Code</th><th>Name</th><th>ECTS</th></tr></thead>
        <tbody>
          {list.map(s => (<tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td>{s.ects||"-"}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
