import { useState, useEffect } from "react";

const EMAILJS_PUBLIC_KEY = "ysexeCKedRLsOxaWa";
const EMAILJS_SERVICE_ID = "service_q8lj6l1";
const EMAILJS_TEMPLATE_ID = "template_trbmjll";

const BOROUGHS = ["Manhattan","Brooklyn","Queens","Bronx","Staten Island","Long Island","Yonkers","Westchester","Other"];
const LEAD_SOURCES = ["Facebook","Instagram","In Person","Referral","Redfin","Zillow","StreetEasy","Referral","Cold Call","Website","Other"];
const STATUSES = ["New","Contacted","Interested","Not Interested","Follow-up","Call Back","Closed"];
const OUTCOMES = ["Connected","Voicemail","No Answer","Wrong Number","Not Interested","Interested","Callback Requested"];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState(() => JSON.parse(localStorage.getItem("lux_agents") || "[]"));
  const [calls, setCalls] = useState(() => JSON.parse(localStorage.getItem("lux_calls") || "[]"));
  const [followUps, setFollowUps] = useState(() => JSON.parse(localStorage.getItem("lux_followups") || "[]"));
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showFUModal, setShowFUModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewAgent, setViewAgent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [emailStatus, setEmailStatus] = useState("");
  const [agentForm, setAgentForm] = useState({firstName:"",lastName:"",phone:"",email:"",brokerage:"",borough:"",leadSource:"",status:"New",notes:""});
  const [callForm, setCallForm] = useState({type:"Outbound",outcome:"",duration:"",notes:""});
  const [fuForm, setFuForm] = useState({date:"",time:"",notes:""});

  useEffect(() => { localStorage.setItem("lux_agents", JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem("lux_calls", JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem("lux_followups", JSON.stringify(followUps)); }, [followUps]);

  // Check for due follow-ups and send email reminders
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
    script.onload = () => {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      checkAndSendReminders();
    };
    document.body.appendChild(script);
  }, []);

  const checkAndSendReminders = () => {
    const today = new Date().toISOString().split("T")[0];
    const lastChecked = localStorage.getItem("lux_last_reminder_check");
    if (lastChecked === today) return; // Only send once per day
    
    const dueTodayFollowUps = followUps.filter(f => !f.completed && f.date === today);
    
    if (dueTodayFollowUps.length > 0) {
      dueTodayFollowUps.forEach(f => {
        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          agent_name: f.agentName,
          agent_phone: f.phone || "N/A",
          agent_brokerage: f.brokerage || "N/A",
          notes: f.notes || "No notes",
        }).then(() => {
          setEmailStatus(`✅ Email reminder sent for ${f.agentName}`);
          setTimeout(() => setEmailStatus(""), 5000);
        }).catch(() => {
          setEmailStatus("⚠️ Could not send email reminder");
          setTimeout(() => setEmailStatus(""), 5000);
        });
      });
      localStorage.setItem("lux_last_reminder_check", today);
    }
  };

  const saveAgent = (e) => {
    e.preventDefault();
    setAgents([...agents, { id: Date.now(), ...agentForm, createdAt: new Date().toISOString() }]);
    setAgentForm({firstName:"",lastName:"",phone:"",email:"",brokerage:"",borough:"",leadSource:"",status:"New",notes:""});
    setShowAgentModal(false);
  };
  const saveCall = (e) => {
    e.preventDefault();
    setCalls([...calls, { id: Date.now(), agentId: selectedAgent.id, agentName: `${selectedAgent.firstName} ${selectedAgent.lastName}`, ...callForm, date: new Date().toISOString() }]);
    setCallForm({type:"Outbound",outcome:"",duration:"",notes:""});
    setShowCallModal(false);
  };
  const saveFU = (e) => {
    e.preventDefault();
    setFollowUps([...followUps, { id: Date.now(), agentId: selectedAgent.id, agentName: `${selectedAgent.firstName} ${selectedAgent.lastName}`, phone: selectedAgent.phone, brokerage: selectedAgent.brokerage, ...fuForm, completed: false }]);
    setFuForm({date:"",time:"",notes:""});
    setShowFUModal(false);
  };
  const completeFU = (id) => setFollowUps(followUps.map(f => f.id === id ? {...f, completed: true} : f));
  const deleteAgent = (id) => { setAgents(agents.filter(a => a.id !== id)); setViewAgent(null); };
  const isOverdue = (d) => new Date(d) < new Date();
  const weekCalls = calls.filter(c => new Date(c.date) > new Date(Date.now() - 7*86400000)).length;
  const pendingFU = followUps.filter(f => !f.completed).length;
  const filtered = agents.filter(a => `${a.firstName} ${a.lastName} ${a.brokerage}`.toLowerCase().includes(search.toLowerCase()) && (filterStatus==="All"||a.status===filterStatus) && (filterSource==="All"||a.leadSource===filterSource));

  const s = {
    page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f5f6fa" },
    nav: { background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 40px", display: "flex", alignItems: "center", height: 64, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
    navBrand: { fontWeight: 800, fontSize: 20, color: "#1a1a2e", letterSpacing: -0.5 },
    navBtn: (active) => ({ padding: "8px 20px", borderRadius: 8, border: "none", background: active ? "#ede9fe" : "transparent", color: active ? "#7c3aed" : "#64748b", fontWeight: active ? 700 : 500, cursor: "pointer", fontSize: 14 }),
    wrap: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px" },
    h1: { fontSize: 28, fontWeight: 800, marginBottom: 4, color: "#1a1a2e" },
    sub: { color: "#94a3b8", fontSize: 14, marginBottom: 32 },
    card: { background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 36 },
    agentCard: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e8e8e8", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
    btnPrimary: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 30, padding: "11px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 },
    btnSecondary: { background: "#ede9fe", color: "#7c3aed", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 },
    btnDanger: { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 },
    input: { width: "100%", padding: "11px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: "#1a1a2e" },
    label: { fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6, color: "#374151" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
    modalBox: { background: "#fff", borderRadius: 20, padding: 36, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
    badge: (color) => ({ fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600, background: color==="green"?"#dcfce7":color==="red"?"#fee2e2":color==="purple"?"#ede9fe":color==="blue"?"#dbeafe":color==="yellow"?"#fef9c3":"#f1f5f9", color: color==="green"?"#15803d":color==="red"?"#dc2626":color==="purple"?"#7c3aed":color==="blue"?"#1d4ed8":color==="yellow"?"#92400e":"#475569" }),
  };

  const statusBadgeColor = (st) => ({New:"blue",Contacted:"yellow",Interested:"green","Not Interested":"red","Follow-up":"purple",Closed:"gray"}[st]||"gray");
  const outcomeBadgeColor = (o) => o==="Interested"?"green":o==="Not Interested"?"red":"yellow";

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.navBrand}>LuxEntra Data</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["dashboard","📊 Dashboard"],["agents","👥 Agents"],["calls","📞 Calls"],["followups","📅 Follow-ups"]].map(([id,label]) => (
            <button key={id} onClick={() => { setPage(id); setViewAgent(null); }} style={s.navBtn(page===id)}>{label}</button>
          ))}
        </div>
      </nav>

      {emailStatus && (
        <div style={{ background: "#dcfce7", color: "#15803d", padding: "12px 24px", textAlign: "center", fontWeight: 600, fontSize: 14 }}>
          {emailStatus}
        </div>
      )}

      <div style={s.wrap}>

        {/* DASHBOARD */}
        {page==="dashboard" && (
          <div>
            <h1 style={s.h1}>Dashboard</h1>
            <p style={s.sub}>Your cold calling performance overview</p>
            <div style={s.statGrid}>
              {[{label:"Total Agents",val:agents.length,sub:"Active contacts",icon:"👥"},{label:"Total Calls",val:calls.length,sub:"All time",icon:"📞"},{label:"Pending Follow-ups",val:pendingFU,sub:"Callbacks remaining",icon:"📅"},{label:"Calls This Week",val:weekCalls,sub:"Last 7 days",icon:"📈"}].map(({label,val,sub,icon}) => (
                <div key={label} style={s.card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>{label}</span>
                    <span style={{fontSize:22}}>{icon}</span>
                  </div>
                  <div style={{fontSize:38,fontWeight:800,color:"#1a1a2e",marginBottom:4}}>{val}</div>
                  <div style={{color:"#94a3b8",fontSize:12}}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={s.card}>
                <h3 style={{fontWeight:700,marginBottom:16,color:"#1a1a2e"}}>Recent Calls</h3>
                {calls.length===0 ? <p style={{color:"#94a3b8",fontSize:14}}>No calls logged yet.</p> : [...calls].reverse().slice(0,5).map(c => (
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:"#1a1a2e"}}>{c.agentName}</div>
                      <div style={{color:"#94a3b8",fontSize:12}}>{c.type} · {new Date(c.date).toLocaleDateString()}</div>
                    </div>
                    <span style={s.badge(outcomeBadgeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <h3 style={{fontWeight:700,marginBottom:16,color:"#1a1a2e"}}>Upcoming Follow-ups</h3>
                {pendingFU===0 ? <p style={{color:"#94a3b8",fontSize:14}}>No pending follow-ups.</p> : followUps.filter(f=>!f.completed).slice(0,5).map(f => (
                  <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:"#1a1a2e"}}>{f.agentName}</div>
                      <div style={{color:"#94a3b8",fontSize:12}}>{f.date}{f.time&&` at ${f.time}`}</div>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div><h1 style={s.h1}>Agents</h1><p style={s.sub}>Manage your real estate contacts</p></div>
              <button onClick={() => setShowAgentModal(true)} style={s.btnPrimary}>+ Add Agent</button>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
              <input placeholder="🔍  Search by name, brokerage..." value={search} onChange={e=>setSearch(e.target.value)} style={{...s.input,width:280,borderRadius:30}} />
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...s.input,width:"auto",borderRadius:30}}>
                <option value="All">All Statuses</option>{STATUSES.map(st=><option key={st}>{st}</option>)}
              </select>
              <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{...s.input,width:"auto",borderRadius:30}}>
                <option value="All">All Sources</option>{LEAD_SOURCES.map(ls=><option key={ls}>{ls}</option>)}
              </select>
            </div>
            <p style={{color:"#94a3b8",fontSize:13,marginBottom:14}}>Showing {filtered.length} of {agents.length} agents</p>
            <div style={{display:"grid",gap:12}}>
              {filtered.length===0 ? (
                <div style={{...s.card,textAlign:"center",padding:48,color:"#94a3b8"}}>No agents found. Click <strong>+ Add Agent</strong> to get started!</div>
              ) : filtered.map(a => (
                <div key={a.id} style={s.agentCard} onClick={() => setViewAgent(a)}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontWeight:700,fontSize:16,color:"#1a1a2e"}}>{a.firstName} {a.lastName}</span>
                      <span style={s.badge(statusBadgeColor(a.status))}>{a.status}</span>
                    </div>
                    <div style={{color:"#64748b",fontSize:13,display:"flex",gap:18,flexWrap:"wrap"}}>
                      {a.phone && <span>📞 {a.phone}</span>}
                      {a.email && <span>✉️ {a.email}</span>}
                      {a.borough && <span>📍 {a.brokerage} · {a.borough}</span>}
                    </div>
                  </div>
                  {a.leadSource && <div style={{textAlign:"right"}}><div style={{color:"#94a3b8",fontSize:11,marginBottom:2}}>Lead Source</div><div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{a.leadSource}</div></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AGENT DETAIL */}
        {page==="agents" && viewAgent && (
          <div>
            <button onClick={() => setViewAgent(null)} style={{background:"none",border:"none",color:"#7c3aed",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:20}}>← Back to Agents</button>
            <div style={{...s.card,marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
                <div>
                  <h2 style={{fontSize:24,fontWeight:800,color:"#1a1a2e",marginBottom:8}}>{viewAgent.firstName} {viewAgent.lastName}</h2>
                  <span style={s.badge(statusBadgeColor(viewAgent.status))}>{viewAgent.status}</span>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={() => { setSelectedAgent(viewAgent); setShowCallModal(true); }} style={s.btnPrimary}>📞 Log Call</button>
                  <button onClick={() => { setSelectedAgent(viewAgent); setShowFUModal(true); }} style={s.btnSecondary}>📅 Follow-up</button>
                  <button onClick={() => deleteAgent(viewAgent.id)} style={s.btnDanger}>🗑 Delete</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
                {[["Phone",viewAgent.phone],["Email",viewAgent.email||"—"],["Brokerage",viewAgent.brokerage||"—"],["Borough",viewAgent.borough||"—"],["Lead Source",viewAgent.leadSource||"—"],["Added",new Date(viewAgent.createdAt).toLocaleDateString()]].map(([k,v]) => (
                  <div key={k}><div style={{color:"#94a3b8",fontSize:11,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{k}</div><div style={{fontWeight:600,color:"#1a1a2e"}}>{v}</div></div>
                ))}
              </div>
              {viewAgent.notes && <div style={{marginTop:20,background:"#f8fafc",borderRadius:10,padding:16}}><div style={{color:"#94a3b8",fontSize:11,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Notes</div><div style={{color:"#374151"}}>{viewAgent.notes}</div></div>}
            </div>
            <h3 style={{fontWeight:700,marginBottom:12,color:"#1a1a2e"}}>Call History ({calls.filter(c=>c.agentId===viewAgent.id).length})</h3>
            <div style={{display:"grid",gap:10}}>
              {calls.filter(c=>c.agentId===viewAgent.id).length===0 ? (
                <div style={{...s.card,color:"#94a3b8",textAlign:"center",padding:24}}>No calls logged yet.</div>
              ) : [...calls].filter(c=>c.agentId===viewAgent.id).reverse().map(c => (
                <div key={c.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,color:"#1a1a2e",marginBottom:4}}>{c.type} Call · {new Date(c.date).toLocaleDateString()} at {new Date(c.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                    {c.duration && <div style={{color:"#64748b",fontSize:13}}>Duration: {c.duration} mins</div>}
                    {c.notes && <div style={{color:"#64748b",fontSize:13,marginTop:4}}>{c.notes}</div>}
                  </div>
                  <span style={s.badge(outcomeBadgeColor(c.outcome))}>{c.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALLS */}
        {page==="calls" && (
          <div>
            <h1 style={s.h1}>Calls</h1>
            <p style={s.sub}>All call activity across your agents</p>
            <div style={{display:"grid",gap:12}}>
              {calls.length===0 ? (
                <div style={{...s.card,textAlign:"center",padding:48,color:"#94a3b8"}}>No calls logged yet. Go to an agent and log a call!</div>
              ) : [...calls].reverse().map(c => (
                <div key={c.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:"#1a1a2e",marginBottom:4}}>{c.agentName}</div>
                    <div style={{color:"#64748b",fontSize:13}}>📞 {c.type} · {new Date(c.date).toLocaleDateString()} at {new Date(c.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}{c.duration?` · ${c.duration} mins`:""}</div>
                    {c.notes && <div style={{color:"#64748b",fontSize:13,marginTop:4}}>{c.notes}</div>}
                  </div>
                  <span style={s.badge(outcomeBadgeColor(c.outcome))}>{c.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOLLOW-UPS */}
        {page==="followups" && (
          <div>
            <h1 style={s.h1}>Follow-ups</h1>
            <p style={s.sub}>Scheduled callbacks and follow-up tasks · Email reminders sent automatically each day</p>
            <div style={{display:"grid",gap:12}}>
              {followUps.filter(f=>!f.completed).length===0 ? (
                <div style={{...s.card,textAlign:"center",padding:48,color:"#94a3b8"}}>No pending follow-ups!</div>
              ) : followUps.filter(f=>!f.completed).map(f => (
                <div key={f.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center",background:isOverdue(f.date)?"#fff8f8":"#fff",border:isOverdue(f.date)?"1px solid #fecaca":"1px solid #e8e8e8"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>{f.agentName}</span>
                      <span style={s.badge(isOverdue(f.date)?"red":"purple")}>{isOverdue(f.date)?"Overdue":"Upcoming"}</span>
                    </div>
                    <div style={{color:"#64748b",fontSize:13,display:"flex",gap:16,flexWrap:"wrap"}}>
                      <span>📅 {new Date(f.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}{f.time&&` at ${f.time}`}</span>
                      {f.phone && <span>📞 {f.phone}</span>}
                      {f.brokerage && <span>🏢 {f.brokerage}</span>}
                    </div>
                    {f.notes && <div style={{color:"#94a3b8",fontSize:13,marginTop:6}}>{f.notes}</div>}
                  </div>
                  <button onClick={() => completeFU(f.id)} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:13,color:"#374151",whiteSpace:"nowrap"}}>✓ Complete</button>
                </div>
              ))}
              {followUps.filter(f=>f.completed).length>0 && (
                <div style={{marginTop:16}}>
                  <p style={{color:"#94a3b8",fontSize:13,marginBottom:10}}>Completed ({followUps.filter(f=>f.completed).length})</p>
                  {followUps.filter(f=>f.completed).map(f => (
                    <div key={f.id} style={{background:"#f8fafc",borderRadius:12,padding:"14px 20px",border:"1px solid #e8e8e8",marginBottom:8,display:"flex",justifyContent:"space-between",opacity:0.6}}>
                      <span style={{fontWeight:600,color:"#374151"}}>{f.agentName}</span>
                      <span style={{color:"#94a3b8",fontSize:13}}>{f.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD AGENT MODAL */}
      {showAgentModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
              <div><h2 style={{fontWeight:800,fontSize:20,color:"#1a1a2e"}}>Add New Agent</h2><p style={{color:"#94a3b8",fontSize:13}}>Add a new real estate agent to your contact list</p></div>
              <button onClick={() => setShowAgentModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveAgent}>
              {[["First Name","firstName","text","e.g., Sarah",true],["Last Name","lastName","text","e.g., Johnson",true],["Phone Number","phone","tel","(212) 555-0123",true],["Email","email","email","agent@brokerage.com",false],["Brokerage","brokerage","text","e.g., RE/MAX Premier",false]].map(([label,key,type,ph,req]) => (
                <div key={key} style={{marginBottom:16}}>
                  <label style={s.label}>{label}{req?" *":""}</label>
                  <input type={type} placeholder={ph} required={req} value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={s.input} />
                </div>
              ))}
              {[["Borough / Area","borough",BOROUGHS,"Select borough"],["Lead Source","leadSource",LEAD_SOURCES,"Select lead source"],["Status","status",STATUSES,"Select status"]].map(([label,key,opts,ph]) => (
                <div key={key} style={{marginBottom:16}}>
                  <label style={s.label}>{label}</label>
                  <select value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                    <option value="">{ph}</option>{opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{marginBottom:24}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="Add any relevant notes..." value={agentForm.notes} onChange={e=>setAgentForm({...agentForm,notes:e.target.value})} style={{...s.input,minHeight:80,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:12}}>
                <button type="button" onClick={() => setShowAgentModal(false)} style={{flex:1,padding:14,borderRadius:12,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,color:"#374151"}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:14,borderRadius:12,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Add Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG CALL MODAL */}
      {showCallModal && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:440}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
              <div><h2 style={{fontWeight:800,fontSize:20,color:"#1a1a2e"}}>Log Call</h2><p style={{color:"#94a3b8",fontSize:13}}>{selectedAgent?.firstName} {selectedAgent?.lastName}</p></div>
              <button onClick={() => setShowCallModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveCall}>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Call Type</label>
                <select value={callForm.type} onChange={e=>setCallForm({...callForm,type:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                  <option>Outbound</option><option>Inbound</option>
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Outcome *</label>
                <select required value={callForm.outcome} onChange={e=>setCallForm({...callForm,outcome:e.target.value})} style={{...s.input,background:"#f8fafc"}}>
                  <option value="">Select outcome</option>{OUTCOMES.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Duration (minutes)</label>
                <input type="number" placeholder="e.g., 5" value={callForm.duration} onChange={e=>setCallForm({...callForm,duration:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:24}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="What happened on the call?" value={callForm.notes} onChange={e=>setCallForm({...callForm,notes:e.target.value})} style={{...s.input,minHeight:80,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:12}}>
                <button type="button" onClick={() => setShowCallModal(false)} style={{flex:1,padding:14,borderRadius:12,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,color:"#374151"}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:14,borderRadius:12,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Log Call</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL */}
      {showFUModal && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:420}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
              <div><h2 style={{fontWeight:800,fontSize:20,color:"#1a1a2e"}}>Schedule Follow-up</h2><p style={{color:"#94a3b8",fontSize:13}}>{selectedAgent?.firstName} {selectedAgent?.lastName}</p></div>
              <button onClick={() => setShowFUModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
            <form onSubmit={saveFU}>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Date *</label>
                <input type="date" required value={fuForm.date} onChange={e=>setFuForm({...fuForm,date:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Time</label>
                <input type="time" value={fuForm.time} onChange={e=>setFuForm({...fuForm,time:e.target.value})} style={s.input} />
              </div>
              <div style={{marginBottom:24}}>
                <label style={s.label}>Notes</label>
                <textarea placeholder="Reason for follow-up..." value={fuForm.notes} onChange={e=>setFuForm({...fuForm,notes:e.target.value})} style={{...s.input,minHeight:80,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:12}}>
                <button type="button" onClick={() => setShowFUModal(false)} style={{flex:1,padding:14,borderRadius:12,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,color:"#374151"}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:14,borderRadius:12,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
