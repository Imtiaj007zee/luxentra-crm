import { useState, useEffect } from "react";

const SUPABASE_URL = "https://zxgkiaywdygdwwdkhthl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z2tpYXl3ZHlnZHd3ZGtodGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzE1ODQsImV4cCI6MjA4ODAwNzU4NH0.NL4me0iktO7XU5OUmU0_4aQr8pj_9lcHC0suUqLupzU";
const EMAILJS_PUBLIC_KEY = "ysexeCKedRLsOxaWa";
const EMAILJS_SERVICE_ID = "service_q8lj6l1";
const EMAILJS_TEMPLATE_ID = "template_trbmjll";

const BOROUGHS = ["Manhattan","Brooklyn","Queens","Bronx","Staten Island","Yonkers","Long Island","Westchester","Other"];
const LEAD_SOURCES = [ "Facebook","Instagram","Walk-in","Referral","Redfin","Zillow","StreetEasy","Referral","Cold Call","Website","Other"];
const STATUSES = ["New","Contacted","Interested","Not Interested","Follow-up","Closed"];
const OUTCOMES = ["Connected","Voicemail","No Answer","Wrong Number","Not Interested","Interested","Callback Requested"];

const db = async (table, method, body, id) => {
  const url = `${SUPABASE_URL}/rest/v1/${table}${id ? `?id=eq.${id}` : ""}`;
  const res = await fetch(method === "GET" ? `${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc` : url, {
    method,
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: body ? JSON.stringify(body) : undefined
  });
  return method === "DELETE" ? null : res.json();
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showFUModal, setShowFUModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewAgent, setViewAgent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [emailStatus, setEmailStatus] = useState("");
  const [agentForm, setAgentForm] = useState({first_name:"",last_name:"",phone:"",email:"",brokerage:"",borough:"",lead_source:"",status:"New",notes:""});
  const [callForm, setCallForm] = useState({type:"Outbound",outcome:"",duration:"",notes:""});
  const [fuForm, setFuForm] = useState({date:"",time:"",notes:""});

  const loadData = async () => {
    setLoading(true);
    const [a, c, f] = await Promise.all([db("agents","GET"), db("calls","GET"), db("follow_ups","GET")]);
    setAgents(a || []);
    setCalls(c || []);
    setFollowUps(f || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
    script.onload = () => {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      setTimeout(checkReminders, 2000);
    };
    document.body.appendChild(script);
  }, []);

  const checkReminders = async () => {
    const today = new Date().toISOString().split("T")[0];
    const lastCheck = localStorage.getItem("lux_reminder");
    if (lastCheck === today) return;
    const fus = await db("follow_ups","GET");
    const due = (fus||[]).filter(f => !f.completed && f.date === today);
    if (due.length > 0) {
      due.forEach(f => {
        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          agent_name: f.agent_name, agent_phone: f.phone||"N/A", agent_brokerage: f.brokerage||"N/A", notes: f.notes||"No notes"
        }).then(() => { setEmailStatus(`✅ Email reminder sent for ${f.agent_name}`); setTimeout(()=>setEmailStatus(""),5000); });
      });
      localStorage.setItem("lux_reminder", today);
    }
  };

  const saveAgent = async (e) => {
    e.preventDefault();
    await db("agents","POST", agentForm);
    setAgentForm({first_name:"",last_name:"",phone:"",email:"",brokerage:"",borough:"",lead_source:"",status:"New",notes:""});
    setShowAgentModal(false);
    loadData();
  };

  const saveCall = async (e) => {
    e.preventDefault();
    await db("calls","POST", { agent_id: selectedAgent.id, agent_name: `${selectedAgent.first_name} ${selectedAgent.last_name}`, ...callForm });
    setCallForm({type:"Outbound",outcome:"",duration:"",notes:""});
    setShowCallModal(false);
    loadData();
  };

  const saveFU = async (e) => {
    e.preventDefault();
    await db("follow_ups","POST", { agent_id: selectedAgent.id, agent_name: `${selectedAgent.first_name} ${selectedAgent.last_name}`, phone: selectedAgent.phone, brokerage: selectedAgent.brokerage, ...fuForm, completed: false });
    setFuForm({date:"",time:"",notes:""});
    setShowFUModal(false);
    loadData();
  };

  const completeFU = async (id) => {
    await db("follow_ups","PATCH",{completed:true},id);
    loadData();
  };

  const deleteAgent = async (id) => {
    await db("agents","DELETE",null,id);
    setViewAgent(null);
    loadData();
  };

  const isOverdue = (d) => new Date(d) < new Date();
  const weekCalls = calls.filter(c => new Date(c.created_at) > new Date(Date.now()-7*86400000)).length;
  const pendingFU = followUps.filter(f=>!f.completed).length;
  const filtered = agents.filter(a => `${a.first_name} ${a.last_name} ${a.brokerage}`.toLowerCase().includes(search.toLowerCase()) && (filterStatus==="All"||a.status===filterStatus) && (filterSource==="All"||a.lead_source===filterSource));

  const s = {
    page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f5f6fa" },
    nav: { background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flexWrap: "wrap", gap: 8 },
    navBrand: { fontWeight: 800, fontSize: 18, color: "#1a1a2e" },
    navBtn: (active) => ({ padding: "7px 14px", borderRadius: 8, border: "none", background: active?"#ede9fe":"transparent", color: active?"#7c3aed":"#64748b", fontWeight: active?700:500, cursor: "pointer", fontSize: 13 }),
    wrap: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px" },
    h1: { fontSize: 24, fontWeight: 800, marginBottom: 4, color: "#1a1a2e" },
    sub: { color: "#94a3b8", fontSize: 13, marginBottom: 24 },
    card: { background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 },
    agentCard: { background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e8e8e8", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
    btnPrimary: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 30, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 },
    btnSecondary: { background: "#ede9fe", color: "#7c3aed", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 },
    btnDanger: { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 },
    input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" },
    label: { fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6, color: "#374151" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 },
    modalBox: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" },
    badge: (color) => ({ display:"inline-block", fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600, background: color==="green"?"#dcfce7":color==="red"?"#fee2e2":color==="purple"?"#ede9fe":color==="blue"?"#dbeafe":color==="yellow"?"#fef9c3":"#f1f5f9", color: color==="green"?"#15803d":color==="red"?"#dc2626":color==="purple"?"#7c3aed":color==="blue"?"#1d4ed8":color==="yellow"?"#92400e":"#475569" }),
  };

  const statusColor = (st) => ({New:"blue",Contacted:"yellow",Interested:"green","Not Interested":"red","Follow-up":"purple",Closed:"gray"}[st]||"gray");
  const outcomeColor = (o) => o==="Interested"?"green":o==="Not Interested"?"red":"yellow";

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontSize:18,color:"#7c3aed",fontFamily:"sans-serif"}}>Loading Luxentra...</div>;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.navBrand}>LuxEntra Data</span>
        <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
          {[["dashboard","📊"],["agents","👥"],["calls","📞"],["followups","📅"]].map(([id,icon]) => (
            <button key={id} onClick={()=>{setPage(id);setViewAgent(null);}} style={s.navBtn(page===id)}>{icon} {id.charAt(0).toUpperCase()+id.slice(1)}</button>
          ))}
        </div>
      </nav>

      {emailStatus && <div style={{background:"#dcfce7",color:"#15803d",padding:"10px 16px",textAlign:"center",fontWeight:600,fontSize:13}}>{emailStatus}</div>}

      <div style={s.wrap}>

        {/* DASHBOARD */}
        {page==="dashboard" && (
          <div>
            <h1 style={s.h1}>Dashboard</h1>
            <p style={s.sub}>Your cold calling performance overview</p>
            <div style={s.statGrid}>
              {[{label:"Total Agents",val:agents.length,icon:"👥"},{label:"Total Calls",val:calls.length,icon:"📞"},{label:"Pending Follow-ups",val:pendingFU,icon:"📅"},{label:"Calls This Week",val:weekCalls,icon:"📈"}].map(({label,val,icon})=>(
                <div key={label} style={s.card}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>{label}</span>
                    <span style={{fontSize:20}}>{icon}</span>
                  </div>
                  <div style={{fontSize:32,fontWeight:800,color:"#1a1a2e"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
              <div style={s.card}>
                <h3 style={{fontWeight:700,marginBottom:14,color:"#1a1a2e",fontSize:15}}>Recent Calls</h3>
                {calls.length===0?<p style={{color:"#94a3b8",fontSize:13}}>No calls logged yet.</p>:calls.slice(0,5).map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:"#1a1a2e"}}>{c.agent_name}</div>
                      <div style={{color:"#94a3b8",fontSize:11}}>{c.type} · {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={s.badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <h3 style={{fontWeight:700,marginBottom:14,color:"#1a1a2e",fontSize:15}}>Upcoming Follow-ups</h3>
                {pendingFU===0?<p style={{color:"#94a3b8",fontSize:13}}>No pending follow-ups.</p>:followUps.filter(f=>!f.completed).slice(0,5).map(f=>(
                  <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:"#1a1a2e"}}>{f.agent_name}</div>
                      <div style={{color:"#94a3b8",fontSize:11}}>{f.date}{f.time&&` at ${f.time}`}</div>
                    </div>
                    <span style={s.badge(isOverdue(f.date)?"red":"purple")}>{isOverdue(f.date)?"Overdue":"Upcoming"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AGENTS LIST */}
        {page==="agents" && !viewAgent && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div><h1 style={s.h1}>Agents</h1><p style={s.sub}>Manage your real estate contacts</p></div>
              <button onClick={()=>setShowAgentModal(true)} style={s.btnPrimary}>+ Add</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={s.input} />
              <div style={{display:"flex",gap:8}}>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...s.input,flex:1}}>
                  <option value="All">All Statuses</option>{STATUSES.map(st=><option key={st}>{st}</option>)}
                </select>
                <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{...s.input,flex:1}}>
                  <option value="All">All Sources</option>{LEAD_SOURCES.map(ls=><option key={ls}>{ls}</option>)}
                </select>
              </div>
            </div>
            <p style={{color:"#94a3b8",fontSize:12,marginBottom:12}}>Showing {filtered.length} of {agents.length} agents</p>
            <div style={{display:"grid",gap:10}}>
              {filtered.length===0?<div style={{...s.card,textAlign:"center",padding:40,color:"#94a3b8"}}>No agents found. Tap <strong>+ Add</strong> to get started!</div>:
                filtered.map(a=>(
                  <div key={a.id} style={s.agentCard} onClick={()=>setViewAgent(a)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>{a.first_name} {a.last_name}</span>
                          <span style={s.badge(statusColor(a.status))}>{a.status}</span>
                        </div>
                        <div style={{color:"#64748b",fontSize:12,display:"flex",flexDirection:"column",gap:3}}>
                          {a.phone&&<span>📞 {a.phone}</span>}
                          {a.brokerage&&<span>🏢 {a.brokerage} {a.borough&&`· ${a.borough}`}</span>}
                        </div>
                      </div>
                      {a.lead_source&&<span style={s.badge("gray")}>{a.lead_source}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AGENT DETAIL */}
        {page==="agents" && viewAgent && (
          <div>
            <button onClick={()=>setViewAgent(null)} style={{background:"none",border:"none",color:"#7c3aed",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:16}}>← Back</button>
            <div style={{...s.card,marginBottom:16}}>
              <div style={{marginBottom:16}}>
                <h2 style={{fontSize:22,fontWeight:800,color:"#1a1a2e",marginBottom:6}}>{viewAgent.first_name} {viewAgent.last_name}</h2>
                <span style={s.badge(statusColor(viewAgent.status))}>{viewAgent.status}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                <button onClick={()=>{setSelectedAgent(viewAgent);setShowCallModal(true);}} style={s.btnPrimary}>📞 Log Call</button>
                <button onClick={()=>{setSelectedAgent(viewAgent);setShowFUModal(true);}} style={s.btnSecondary}>📅 Follow-up</button>
                <button onClick={()=>deleteAgent(viewAgent.id)} style={s.btnDanger}>🗑 Delete</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[["Phone",viewAgent.phone],["Email",viewAgent.email||"—"],["Brokerage",viewAgent.brokerage||"—"],["Borough",viewAgent.borough||"—"],["Lead Source",viewAgent.lead_source||"—"],["Added",new Date(viewAgent.created_at).toLocaleDateString()]].map(([k,v])=>(
                  <div key={k}><div style={{color:"#94a3b8",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{k}</div><div style={{fontWeight:600,color:"#1a1a2e",fontSize:13}}>{v}</div></div>
                ))}
              </div>
              {viewAgent.notes&&<div style={{marginTop:14,background:"#f8fafc",borderRadius:8,padding:12}}><div style={{color:"#94a3b8",fontSize:10,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Notes</div><div style={{color:"#374151",fontSize:13}}>{viewAgent.notes}</div></div>}
            </div>
            <h3 style={{fontWeight:700,marginBottom:10,color:"#1a1a2e",fontSize:15}}>Call History</h3>
            <div style={{display:"grid",gap:8}}>
              {calls.filter(c=>c.agent_id===viewAgent.id).length===0?<div style={{...s.card,color:"#94a3b8",textAlign:"center",padding:20,fontSize:13}}>No calls logged yet.</div>:
                calls.filter(c=>c.agent_id===viewAgent.id).map(c=>(
                  <div key={c.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600,color:"#1a1a2e",fontSize:13,marginBottom:2}}>{c.type} · {new Date(c.created_at).toLocaleDateString()}</div>
                      {c.duration&&<div style={{color:"#64748b",fontSize:12}}>{c.duration} mins</div>}
                      {c.notes&&<div style={{color:"#64748b",fontSize:12,marginTop:2}}>{c.notes}</div>}
                    </div>
                    <span style={s.badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CALLS */}
        {page==="calls" && (
          <div>
            <h1 style={s.h1}>Calls</h1>
            <p style={s.sub}>All call activity</p>
            <div style={{display:"grid",gap:10}}>
              {calls.length===0?<div style={{...s.card,textAlign:"center",padding:40,color:"#94a3b8"}}>No calls logged yet.</div>:
                calls.map(c=>(
                  <div key={c.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e",marginBottom:3}}>{c.agent_name}</div>
                      <div style={{color:"#64748b",fontSize:12}}>📞 {c.type} · {new Date(c.created_at).toLocaleDateString()}{c.duration?` · ${c.duration} mins`:""}</div>
                      {c.notes&&<div style={{color:"#64748b",fontSize:12,marginTop:2}}>{c.notes}</div>}
                    </div>
                    <span style={s.badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* FOLLOW-UPS */}
        {page==="followups" && (
          <div>
            <h1 style={s.h1}>Follow-ups</h1>
            <p style={s.sub}>Scheduled callbacks · Email reminders sent automatically</p>
            <div style={{display:"grid",gap:10}}>
              {followUps.filter(f=>!f.completed).length===0?<div style={{...s.card,textAlign:"center",padding:40,color:"#94a3b8"}}>No pending follow-ups!</div>:
                followUps.filter(f=>!f.completed).map(f=>(
                  <div key={f.id} style={{...s.card,background:isOverdue(f.date)?"#fff8f8":"#fff",border:isOverdue(f.date)?"1px solid #fecaca":"1px solid #e8e8e8"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{f.agent_name}</span>
                          <span style={s.badge(isOverdue(f.date)?"red":"purple")}>{isOverdue(f.date)?"Overdue":"Upcoming"}</span>
                        </div>
                        <div style={{color:"#64748b",fontSize:12}}>📅 {new Date(f.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}{f.time&&` at ${f.time}`}</div>
                        {f.phone&&<div style={{color:"#64748b",fontSize:12}}>📞 {f.phone}</div>}
                        {f.notes&&<div style={{color:"#94a3b8",fontSize:12,marginTop:4}}>{f.notes}</div>}
                      </div>
                      <button onClick={()=>completeFU(f.id)} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:12,color:"#374151",whiteSpace:"nowrap",marginLeft:8}}>✓ Done</button>
                    </div>
                  </div>
                ))}
              {followUps.filter(f=>f.completed).length>0&&(
                <div style={{marginTop:12}}>
                  <p style={{color:"#94a3b8",fontSize:12,marginBottom:8}}>Completed ({followUps.filter(f=>f.completed).length})</p>
                  {followUps.filter(f=>f.completed).map(f=>(
                    <div key={f.id} style={{background:"#f8fafc",borderRadius:10,padding:"12px 16px",border:"1px solid #e8e8e8",marginBottom:6,display:"flex",justifyContent:"space-between",opacity:0.6}}>
                      <span style={{fontWeight:600,color:"#374151",fontSize:13}}>{f.agent_name}</span>
                      <span style={{color:"#94a3b8",fontSize:12}}>{f.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD AGENT MODAL */}
      {showAgentModal&&(
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontWeight:800,fontSize:18,color:"#1a1a2e"}}>Add New Agent</h2>
              <button onClick={()=>setShowAgentModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveAgent}>
              {[["First Name","first_name","text","Sarah",true],["Last Name","last_name","text","Johnson",true],["Phone","phone","tel","(212) 555-0123",true],["Email","email","email","agent@brokerage.com",false],["Brokerage","brokerage","text","RE/MAX Premier",false]].map(([label,key,type,ph,req])=>(
                <div key={key} style={{marginBottom:14}}>
                  <label style={s.label}>{label}{req?" *":""}</label>
                  <input type={type} placeholder={ph} required={req} value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={s.input} />
                </div>
              ))}
              {[["Borough","borough",BOROUGHS,"Select borough"],["Lead Source","lead_source",LEAD_SOURCES,"Select source"],["Status","status",STATUSES,"Select status"]].map(([label,key,opts,ph])=>(
                <div key={key} style={{marginBottom:14}}>
                  <label style={s.label}>{label}</label>
                  <select value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                    <option value="">{ph}</option>{opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{marginBottom:20}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="Any notes..." value={agentForm.notes} onChange={e=>setAgentForm({...agentForm,notes:e.target.value})} style={{...s.input,minHeight:70,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowAgentModal(false)} style={{flex:1,padding:13,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:13,borderRadius:10,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Add Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG CALL MODAL */}
      {showCallModal&&(
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div><h2 style={{fontWeight:800,fontSize:18,color:"#1a1a2e"}}>Log Call</h2><p style={{color:"#94a3b8",fontSize:13}}>{selectedAgent?.first_name} {selectedAgent?.last_name}</p></div>
              <button onClick={()=>setShowCallModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveCall}>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Call Type</label>
                <select value={callForm.type} onChange={e=>setCallForm({...callForm,type:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                  <option>Outbound</option><option>Inbound</option>
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Outcome *</label>
                <select required value={callForm.outcome} onChange={e=>setCallForm({...callForm,outcome:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                  <option value="">Select outcome</option>{OUTCOMES.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Duration (minutes)</label>
                <input type="number" placeholder="5" value={callForm.duration} onChange={e=>setCallForm({...callForm,duration:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:20}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="What happened?" value={callForm.notes} onChange={e=>setCallForm({...callForm,notes:e.target.value})} style={{...s.input,minHeight:70,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowCallModal(false)} style={{flex:1,padding:13,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:13,borderRadius:10,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Log Call</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL */}
      {showFUModal&&(
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div><h2 style={{fontWeight:800,fontSize:18,color:"#1a1a2e"}}>Schedule Follow-up</h2><p style={{color:"#94a3b8",fontSize:13}}>{selectedAgent?.first_name} {selectedAgent?.last_name}</p></div>
              <button onClick={()=>setShowFUModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveFU}>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Date *</label>
                <input type="date" required value={fuForm.date} onChange={e=>setFuForm({...fuForm,date:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Time</label>
                <input type="time" value={fuForm.time} onChange={e=>setFuForm({...fuForm,time:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:20}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="Reason for follow-up..." value={fuForm.notes} onChange={e=>setFuForm({...fuForm,notes:e.target.value})} style={{...s.input,minHeight:70,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowFUModal(false)} style={{flex:1,padding:13,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:13,borderRadius:10,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
