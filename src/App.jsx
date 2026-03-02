import { useState, useEffect } from "react";

const SUPABASE_URL = "https://zxgkiaywdygdwwdkhthl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z2tpYXl3ZHlnZHd3ZGtodGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzE1ODQsImV4cCI6MjA4ODAwNzU4NH0.NL4me0iktO7XU5OUmU0_4aQr8pj_9lcHC0suUqLupzU";
const EMAILJS_PUBLIC_KEY = "ysexeCKedRLsOxaWa";
const EMAILJS_SERVICE_ID = "service_q8lj6l1";
const EMAILJS_TEMPLATE_ID = "template_trbmjll";

const BOROUGHS = ["Manhattan","Brooklyn","Queens","Bronx","Staten Island","Long Island","Westchester","Other"];
const LEAD_SOURCES = ["Redfin","Zillow","StreetEasy","Referral","Cold Call","Website","Other"];
const STATUSES = ["New","Contacted","Interested","Not Interested","Follow-up","Closed"];
const OUTCOMES = ["Connected","Voicemail","No Answer","Wrong Number","Not Interested","Interested","Callback Requested"];

const api = async (table, method, body, query="") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (method === "DELETE" || method === "PATCH") return null;
  return res.json();
};

const C = {
  purple: "#7c3aed", lightPurple: "#ede9fe", darkText: "#1a1a2e",
  gray: "#64748b", lightGray: "#94a3b8", border: "#e2e8f0",
  bg: "#f8fafc", white: "#fff", green: "#15803d", red: "#dc2626"
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [callers, setCallers] = useState(() => JSON.parse(localStorage.getItem("lux_callers") || '["Imtiaj"]'));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCallerSettings, setShowCallerSettings] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewAgent, setViewAgent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [newCallerName, setNewCallerName] = useState("");
  const [agentForm, setAgentForm] = useState({first_name:"",last_name:"",phone:"",email:"",brokerage:"",borough:"",lead_source:"",status:"New",notes:""});
  const [callForm, setCallForm] = useState({caller_name:"",type:"Outbound",outcome:"",duration:"",notes:"",schedule_followup:false,followup_date:"",followup_time:"",followup_notes:""});

  useEffect(() => { localStorage.setItem("lux_callers", JSON.stringify(callers)); }, [callers]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = async () => {
    setLoading(true);
    const [a,c,f] = await Promise.all([
      api("agents","GET",null,"?order=created_at.desc"),
      api("calls","GET",null,"?order=created_at.desc"),
      api("follow_ups","GET",null,"?order=created_at.desc")
    ]);
    setAgents(a||[]); setCalls(c||[]); setFollowUps(f||[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
    s.onload = () => { window.emailjs.init(EMAILJS_PUBLIC_KEY); setTimeout(checkReminders, 2000); };
    document.body.appendChild(s);
  }, []);

  const checkReminders = async () => {
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem("lux_reminder") === today) return;
    const fus = await api("follow_ups","GET",null,"?completed=eq.false");
    (fus||[]).filter(f => f.date === today).forEach(f => {
      window.emailjs?.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        agent_name: f.agent_name, agent_phone: f.phone||"N/A", agent_brokerage: f.brokerage||"N/A", notes: f.notes||"No notes"
      }).then(() => showToast(`📧 Reminder sent for ${f.agent_name}`));
    });
    localStorage.setItem("lux_reminder", today);
  };

  const saveAgent = async (e) => {
    e.preventDefault();
    await api("agents","POST",agentForm);
    setAgentForm({first_name:"",last_name:"",phone:"",email:"",brokerage:"",borough:"",lead_source:"",status:"New",notes:""});
    setShowAgentModal(false); load(); showToast("✅ Agent added successfully!");
  };

  const saveCall = async (e) => {
    e.preventDefault();
    const { schedule_followup, followup_date, followup_time, followup_notes, ...callData } = callForm;
    await api("calls","POST", { agent_id: selectedAgent.id, agent_name: `${selectedAgent.first_name} ${selectedAgent.last_name}`, ...callData });
    if (schedule_followup && followup_date) {
      await api("follow_ups","POST", { agent_id: selectedAgent.id, agent_name: `${selectedAgent.first_name} ${selectedAgent.last_name}`, phone: selectedAgent.phone, brokerage: selectedAgent.brokerage, date: followup_date, time: followup_time, notes: followup_notes, completed: false });
      showToast("✅ Call logged & follow-up scheduled!");
    } else { showToast("✅ Call logged successfully!"); }
    setCallForm({caller_name:"",type:"Outbound",outcome:"",duration:"",notes:"",schedule_followup:false,followup_date:"",followup_time:"",followup_notes:""});
    setShowCallModal(false); load();
  };

  const completeFU = async (id) => { await api("follow_ups","PATCH",{completed:true},`?id=eq.${id}`); load(); showToast("✅ Follow-up completed!"); };
  const deleteAgent = async (id) => { await api("agents","DELETE",null,`?id=eq.${id}`); setViewAgent(null); load(); showToast("🗑 Agent deleted"); };
  const addCaller = () => { if (newCallerName.trim()) { setCallers([...callers, newCallerName.trim()]); setNewCallerName(""); } };
  const removeCaller = (name) => setCallers(callers.filter(c => c !== name));

  const isOverdue = (d) => new Date(d) < new Date();
  const today = new Date().toISOString().split("T")[0];
  const weekCalls = calls.filter(c => new Date(c.created_at) > new Date(Date.now()-7*86400000)).length;
  const pendingFU = followUps.filter(f=>!f.completed).length;
  const dueTodayCount = followUps.filter(f=>!f.completed && f.date===today).length;
  const filtered = agents.filter(a => `${a.first_name} ${a.last_name} ${a.brokerage}`.toLowerCase().includes(search.toLowerCase()) && (filterStatus==="All"||a.status===filterStatus) && (filterSource==="All"||a.lead_source===filterSource));

  const badge = (color) => ({ display:"inline-block", fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
    background: color==="green"?"#dcfce7":color==="red"?"#fee2e2":color==="purple"?"#ede9fe":color==="blue"?"#dbeafe":color==="yellow"?"#fef9c3":color==="orange"?"#ffedd5":"#f1f5f9",
    color: color==="green"?C.green:color==="red"?C.red:color==="purple"?C.purple:color==="blue"?"#1d4ed8":color==="yellow"?"#92400e":color==="orange"?"#c2410c":"#475569"
  });
  const statusColor = (s) => ({New:"blue",Contacted:"yellow",Interested:"green","Not Interested":"red","Follow-up":"purple",Closed:"gray"}[s]||"gray");
  const outcomeColor = (o) => o==="Interested"?"green":o==="Not Interested"?"red":o==="Connected"?"blue":o==="Callback Requested"?"purple":"yellow";

  const input = { width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, outline:"none", boxSizing:"border-box", background:C.white, color:C.darkText, fontFamily:"inherit" };
  const label = { fontWeight:600, fontSize:13, display:"block", marginBottom:6, color:"#374151" };

  if (loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"sans-serif"}}>
      <div style={{fontSize:32,marginBottom:16}}>⚡</div>
      <div style={{fontSize:18,fontWeight:700,color:C.purple}}>Loading Luxentra...</div>
    </div>
  );

  return (
    <div style={{fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight:"100vh", background:C.bg}}>

      {/* NAV */}
      <nav style={{background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <button onClick={()=>{setPage("dashboard");setViewAgent(null);}} style={{background:"none",border:"none",cursor:"pointer",fontWeight:800,fontSize:18,color:C.darkText,padding:0}}>
          LuxEntra Data
        </button>
        <div style={{display:"flex",gap:2}}>
          {[["dashboard","📊 Dashboard"],["agents","👥 Agents"],["calls","📞 Calls"],["followups","📅 Follow-ups"],["settings","⚙️"]].map(([id,label]) => (
            <button key={id} onClick={()=>{setPage(id);setViewAgent(null);}} style={{padding:"7px 12px",borderRadius:8,border:"none",background:page===id?C.lightPurple:"transparent",color:page===id?C.purple:C.gray,fontWeight:page===id?700:500,cursor:"pointer",fontSize:13,transition:"all 0.15s"}}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* TOAST */}
      {toast && <div style={{background:"#1a1a2e",color:"#fff",padding:"12px 20px",textAlign:"center",fontWeight:600,fontSize:13,position:"sticky",top:60,zIndex:99}}>{toast}</div>}

      <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 16px"}}>

        {/* ── DASHBOARD ── */}
        {page==="dashboard" && (
          <div>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:26,fontWeight:800,color:C.darkText,marginBottom:4}}>Dashboard</h1>
              <p style={{color:C.lightGray,fontSize:13}}>Your cold calling performance overview</p>
            </div>
            {dueTodayCount > 0 && (
              <div onClick={()=>setPage("followups")} style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:12,padding:"12px 16px",marginBottom:20,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,color:"#92400e"}}>🔔 {dueTodayCount} follow-up{dueTodayCount>1?"s":""} due today!</span>
                <span style={{color:"#92400e",fontSize:13}}>View →</span>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:24}}>
              {[
                {label:"Total Agents",val:agents.length,icon:"👥",color:"#dbeafe",link:"agents",sub:"Click to view"},
                {label:"Total Calls",val:calls.length,icon:"📞",color:"#dcfce7",link:"calls",sub:"All time"},
                {label:"Pending Follow-ups",val:pendingFU,icon:"📅",color:"#fef9c3",link:"followups",sub:"Callbacks remaining"},
                {label:"Calls This Week",val:weekCalls,icon:"📈",color:"#ede9fe",link:"calls",sub:"Last 7 days"},
              ].map(({label,val,icon,color,link,sub})=>(
                <div key={label} onClick={()=>setPage(link)} style={{background:C.white,borderRadius:14,padding:"20px",border:`1px solid ${C.border}`,cursor:"pointer",transition:"box-shadow 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.lightGray,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
                    <div style={{background:color,borderRadius:8,padding:"6px 8px",fontSize:18}}>{icon}</div>
                  </div>
                  <div style={{fontSize:36,fontWeight:800,color:C.darkText,marginBottom:4}}>{val}</div>
                  <div style={{fontSize:12,color:C.lightGray}}>{sub} →</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gap:16}}>
              <div style={{background:C.white,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h3 style={{fontWeight:700,color:C.darkText,fontSize:15}}>Recent Calls</h3>
                  <button onClick={()=>setPage("calls")} style={{background:"none",border:"none",color:C.purple,fontWeight:600,cursor:"pointer",fontSize:13}}>View all →</button>
                </div>
                {calls.length===0 ? <p style={{color:C.lightGray,fontSize:13,textAlign:"center",padding:"20px 0"}}>No calls logged yet.</p> :
                  calls.slice(0,5).map(c=>(
                    <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bg}`}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:14,color:C.darkText}}>{c.agent_name}</div>
                        <div style={{color:C.lightGray,fontSize:12}}>{c.caller_name && `${c.caller_name} · `}{c.type} · {new Date(c.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                    </div>
                  ))}
              </div>
              <div style={{background:C.white,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h3 style={{fontWeight:700,color:C.darkText,fontSize:15}}>Upcoming Follow-ups</h3>
                  <button onClick={()=>setPage("followups")} style={{background:"none",border:"none",color:C.purple,fontWeight:600,cursor:"pointer",fontSize:13}}>View all →</button>
                </div>
                {pendingFU===0 ? <p style={{color:C.lightGray,fontSize:13,textAlign:"center",padding:"20px 0"}}>No pending follow-ups.</p> :
                  followUps.filter(f=>!f.completed).slice(0,5).map(f=>(
                    <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bg}`}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:14,color:C.darkText}}>{f.agent_name}</div>
                        <div style={{color:C.lightGray,fontSize:12}}>{f.date}{f.time&&` at ${f.time}`}</div>
                      </div>
                      <span style={badge(isOverdue(f.date)?"red":"purple")}>{isOverdue(f.date)?"Overdue":"Upcoming"}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AGENTS ── */}
        {page==="agents" && !viewAgent && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div><h1 style={{fontSize:24,fontWeight:800,color:C.darkText,marginBottom:2}}>Agents</h1><p style={{color:C.lightGray,fontSize:13}}>Manage your real estate contacts</p></div>
              <button onClick={()=>setShowAgentModal(true)} style={{background:C.purple,color:C.white,border:"none",borderRadius:30,padding:"11px 22px",fontWeight:700,cursor:"pointer",fontSize:14}}>+ Add Agent</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              <input placeholder="🔍  Search by name, brokerage..." value={search} onChange={e=>setSearch(e.target.value)} style={{...input,borderRadius:30,padding:"11px 18px"}} />
              <div style={{display:"flex",gap:8}}>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...input,flex:1}}>
                  <option value="All">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
                <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{...input,flex:1}}>
                  <option value="All">All Sources</option>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <p style={{color:C.lightGray,fontSize:12,marginBottom:12}}>Showing {filtered.length} of {agents.length} agents</p>
            <div style={{display:"grid",gap:10}}>
              {filtered.length===0 ?
                <div style={{background:C.white,borderRadius:14,padding:48,textAlign:"center",color:C.lightGray,border:`1px solid ${C.border}`}}>No agents found. Click <strong>+ Add Agent</strong> to get started!</div> :
                filtered.map(a=>(
                  <div key={a.id} onClick={()=>setViewAgent(a)} style={{background:C.white,borderRadius:14,padding:"16px 20px",border:`1px solid ${C.border}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:15,color:C.darkText}}>{a.first_name} {a.last_name}</span>
                          <span style={badge(statusColor(a.status))}>{a.status}</span>
                        </div>
                        <div style={{color:C.gray,fontSize:13,display:"flex",flexDirection:"column",gap:3}}>
                          {a.phone&&<span>📞 {a.phone}</span>}
                          {a.brokerage&&<span>🏢 {a.brokerage}{a.borough?` · ${a.borough}`:""}</span>}
                          {a.email&&<span>✉️ {a.email}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                        {a.lead_source&&<span style={badge("gray")}>{a.lead_source}</span>}
                        <span style={{color:C.lightGray,fontSize:11}}>{calls.filter(c=>c.agent_id===a.id).length} calls</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── AGENT DETAIL ── */}
        {page==="agents" && viewAgent && (
          <div>
            <button onClick={()=>setViewAgent(null)} style={{background:"none",border:"none",color:C.purple,fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
              ← Back to Agents
            </button>
            <div style={{background:C.white,borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <h2 style={{fontSize:22,fontWeight:800,color:C.darkText,marginBottom:6}}>{viewAgent.first_name} {viewAgent.last_name}</h2>
                  <span style={badge(statusColor(viewAgent.status))}>{viewAgent.status}</span>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                <button onClick={()=>{setSelectedAgent(viewAgent);setShowCallModal(true);}} style={{background:C.purple,color:C.white,border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>📞 Log Call</button>
                <button onClick={()=>deleteAgent(viewAgent.id)} style={{background:"#fef2f2",color:C.red,border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🗑 Delete</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[["📞 Phone",viewAgent.phone||"—"],["✉️ Email",viewAgent.email||"—"],["🏢 Brokerage",viewAgent.brokerage||"—"],["📍 Borough",viewAgent.borough||"—"],["📊 Lead Source",viewAgent.lead_source||"—"],["📅 Added",new Date(viewAgent.created_at).toLocaleDateString()]].map(([k,v])=>(
                  <div key={k} style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{color:C.lightGray,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{k}</div>
                    <div style={{fontWeight:600,color:C.darkText,fontSize:13}}>{v}</div>
                  </div>
                ))}
              </div>
              {viewAgent.notes&&<div style={{marginTop:14,background:C.bg,borderRadius:10,padding:14}}>
                <div style={{color:C.lightGray,fontSize:10,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Notes</div>
                <div style={{color:"#374151",fontSize:13}}>{viewAgent.notes}</div>
              </div>}
            </div>
            <h3 style={{fontWeight:700,marginBottom:10,color:C.darkText,fontSize:15}}>Call History ({calls.filter(c=>c.agent_id===viewAgent.id).length})</h3>
            <div style={{display:"grid",gap:8}}>
              {calls.filter(c=>c.agent_id===viewAgent.id).length===0 ?
                <div style={{background:C.white,borderRadius:14,padding:24,color:C.lightGray,textAlign:"center",border:`1px solid ${C.border}`,fontSize:13}}>No calls logged yet.</div> :
                calls.filter(c=>c.agent_id===viewAgent.id).map(c=>(
                  <div key={c.id} style={{background:C.white,borderRadius:12,padding:"14px 18px",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600,color:C.darkText,fontSize:13,marginBottom:3}}>
                        {c.caller_name && <span style={{color:C.purple,marginRight:8}}>👤 {c.caller_name}</span>}
                        {c.type} · {new Date(c.created_at).toLocaleDateString()} at {new Date(c.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                      </div>
                      {c.duration&&<div style={{color:C.gray,fontSize:12}}>⏱ {c.duration} mins</div>}
                      {c.notes&&<div style={{color:C.gray,fontSize:12,marginTop:2}}>{c.notes}</div>}
                    </div>
                    <span style={badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── CALLS ── */}
        {page==="calls" && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,color:C.darkText,marginBottom:4}}>Calls</h1>
            <p style={{color:C.lightGray,fontSize:13,marginBottom:20}}>All call activity · {calls.length} total</p>
            <div style={{display:"grid",gap:10}}>
              {calls.length===0 ?
                <div style={{background:C.white,borderRadius:14,padding:48,textAlign:"center",color:C.lightGray,border:`1px solid ${C.border}`}}>No calls logged yet. Go to an agent and log a call!</div> :
                calls.map(c=>(
                  <div key={c.id} style={{background:C.white,borderRadius:12,padding:"16px 20px",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:C.darkText,marginBottom:4}}>{c.agent_name}</div>
                      <div style={{color:C.gray,fontSize:12,display:"flex",gap:12,flexWrap:"wrap"}}>
                        {c.caller_name&&<span>👤 {c.caller_name}</span>}
                        <span>📞 {c.type}</span>
                        <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.duration&&<span>⏱ {c.duration} mins</span>}
                      </div>
                      {c.notes&&<div style={{color:C.gray,fontSize:12,marginTop:4}}>{c.notes}</div>}
                    </div>
                    <span style={badge(outcomeColor(c.outcome))}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── FOLLOW-UPS ── */}
        {page==="followups" && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,color:C.darkText,marginBottom:4}}>Follow-ups</h1>
            <p style={{color:C.lightGray,fontSize:13,marginBottom:20}}>Scheduled callbacks · Email reminders sent automatically each day</p>
            <div style={{display:"grid",gap:10}}>
              {followUps.filter(f=>!f.completed).length===0 ?
                <div style={{background:C.white,borderRadius:14,padding:48,textAlign:"center",color:C.lightGray,border:`1px solid ${C.border}`}}>🎉 No pending follow-ups!</div> :
                followUps.filter(f=>!f.completed).map(f=>(
                  <div key={f.id} style={{background:isOverdue(f.date)?"#fff8f8":C.white,borderRadius:12,padding:"16px 20px",border:`1px solid ${isOverdue(f.date)?"#fecaca":C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14,color:C.darkText}}>{f.agent_name}</span>
                        <span style={badge(isOverdue(f.date)?"red":f.date===today?"orange":"purple")}>{isOverdue(f.date)?"Overdue":f.date===today?"Due Today":"Upcoming"}</span>
                      </div>
                      <div style={{color:C.gray,fontSize:12,display:"flex",flexDirection:"column",gap:3}}>
                        <span>📅 {new Date(f.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}{f.time&&` at ${f.time}`}</span>
                        {f.phone&&<span>📞 {f.phone}</span>}
                        {f.brokerage&&<span>🏢 {f.brokerage}</span>}
                        {f.notes&&<span style={{color:C.lightGray}}>📝 {f.notes}</span>}
                      </div>
                    </div>
                    <button onClick={()=>completeFU(f.id)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 16px",fontWeight:700,cursor:"pointer",fontSize:12,color:"#374151",whiteSpace:"nowrap"}}>✓ Done</button>
                  </div>
                ))}
              {followUps.filter(f=>f.completed).length>0&&(
                <div style={{marginTop:16}}>
                  <p style={{color:C.lightGray,fontSize:12,marginBottom:10,fontWeight:600}}>COMPLETED ({followUps.filter(f=>f.completed).length})</p>
                  {followUps.filter(f=>f.completed).map(f=>(
                    <div key={f.id} style={{background:C.bg,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.border}`,marginBottom:6,display:"flex",justifyContent:"space-between",opacity:0.5}}>
                      <span style={{fontWeight:600,color:"#374151",fontSize:13}}>✓ {f.agent_name}</span>
                      <span style={{color:C.lightGray,fontSize:12}}>{f.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {page==="settings" && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,color:C.darkText,marginBottom:4}}>Settings</h1>
            <p style={{color:C.lightGray,fontSize:13,marginBottom:24}}>Manage your team and preferences</p>
            <div style={{background:C.white,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <h3 style={{fontWeight:700,fontSize:16,color:C.darkText,marginBottom:4}}>👤 Caller Names</h3>
              <p style={{color:C.lightGray,fontSize:13,marginBottom:16}}>Add the names of people on your team who log calls</p>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <input placeholder="Enter name..." value={newCallerName} onChange={e=>setNewCallerName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCaller()} style={{...input,flex:1}} />
                <button onClick={addCaller} style={{background:C.purple,color:C.white,border:"none",borderRadius:10,padding:"12px 20px",fontWeight:700,cursor:"pointer",fontSize:14}}>Add</button>
              </div>
              <div style={{display:"grid",gap:8}}>
                {callers.map(name=>(
                  <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg,borderRadius:10,padding:"12px 16px"}}>
                    <span style={{fontWeight:600,color:C.darkText}}>👤 {name}</span>
                    <button onClick={()=>removeCaller(name)} style={{background:"#fef2f2",color:C.red,border:"none",borderRadius:8,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD AGENT MODAL ── */}
      {showAgentModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div><h2 style={{fontWeight:800,fontSize:18,color:C.darkText}}>Add New Agent</h2><p style={{color:C.lightGray,fontSize:13}}>Add a real estate contact</p></div>
              <button onClick={()=>setShowAgentModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.lightGray}}>✕</button>
            </div>
            <form onSubmit={saveAgent}>
              {[["First Name","first_name","text","Sarah",true],["Last Name","last_name","text","Johnson",true],["Phone","phone","tel","(212) 555-0123",true],["Email","email","email","agent@brokerage.com",false],["Brokerage","brokerage","text","RE/MAX Premier",false]].map(([lbl,key,type,ph,req])=>(
                <div key={key} style={{marginBottom:14}}>
                  <label style={label}>{lbl}{req?" *":""}</label>
                  <input type={type} placeholder={ph} required={req} value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={input} />
                </div>
              ))}
              {[["Borough","borough",BOROUGHS,"Select borough"],["Lead Source","lead_source",LEAD_SOURCES,"Select source"],["Status","status",STATUSES,""]].map(([lbl,key,opts,ph])=>(
                <div key={key} style={{marginBottom:14}}>
                  <label style={label}>{lbl}</label>
                  <select value={agentForm[key]} onChange={e=>setAgentForm({...agentForm,[key]:e.target.value})} style={{...input,background:C.bg}}>
                    {ph&&<option value="">{ph}</option>}{opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{marginBottom:20}}>
                <label style={label}>Notes</label>
                <textarea placeholder="Any relevant notes..." value={agentForm.notes} onChange={e=>setAgentForm({...agentForm,notes:e.target.value})} style={{...input,minHeight:70,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowAgentModal(false)} style={{flex:1,padding:13,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:13,borderRadius:10,border:"none",background:C.purple,color:C.white,fontWeight:700,cursor:"pointer",fontSize:14}}>Add Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOG CALL MODAL ── */}
      {showCallModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:540,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <h2 style={{fontWeight:800,fontSize:18,color:C.darkText}}>Log Call</h2>
                <p style={{color:C.lightGray,fontSize:13}}>📞 {selectedAgent?.first_name} {selectedAgent?.last_name} · {selectedAgent?.phone}</p>
              </div>
              <button onClick={()=>setShowCallModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.lightGray}}>✕</button>
            </div>
            <form onSubmit={saveCall}>
              <div style={{marginBottom:14}}>
                <label style={label}>Who is calling? *</label>
                <select required value={callForm.caller_name} onChange={e=>setCallForm({...callForm,caller_name:e.target.value})} style={{...input,background:C.bg}}>
                  <option value="">Select caller</option>{callers.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <label style={label}>Call Type</label>
                  <select value={callForm.type} onChange={e=>setCallForm({...callForm,type:e.target.value})} style={{...input,background:C.bg}}>
                    <option>Outbound</option><option>Inbound</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Duration (mins)</label>
                  <input type="number" placeholder="5" value={callForm.duration} onChange={e=>setCallForm({...callForm,duration:e.target.value})} style={input} />
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={label}>Outcome *</label>
                <select required value={callForm.outcome} onChange={e=>setCallForm({...callForm,outcome:e.target.value})} style={{...input,background:C.bg}}>
                  <option value="">Select outcome</option>{OUTCOMES.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <label style={label}>Notes</label>
                <textarea placeholder="What happened on the call?" value={callForm.notes} onChange={e=>setCallForm({...callForm,notes:e.target.value})} style={{...input,minHeight:70,resize:"vertical"}} />
              </div>

              {/* FOLLOW-UP SECTION */}
              <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:20}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom: callForm.schedule_followup?14:0}}>
                  <input type="checkbox" checked={callForm.schedule_followup} onChange={e=>setCallForm({...callForm,schedule_followup:e.target.checked})} style={{width:18,height:18,accentColor:C.purple}} />
                  <span style={{fontWeight:700,fontSize:14,color:C.darkText}}>📅 Schedule a follow-up for this call</span>
                </label>
                {callForm.schedule_followup&&(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div>
                        <label style={label}>Date *</label>
                        <input type="date" required value={callForm.followup_date} onChange={e=>setCallForm({...callForm,followup_date:e.target.value})} style={input} />
                      </div>
                      <div>
                        <label style={label}>Time</label>
                        <input type="time" value={callForm.followup_time} onChange={e=>setCallForm({...callForm,followup_time:e.target.value})} style={input} />
                      </div>
                    </div>
                    <div>
                      <label style={label}>Follow-up Notes</label>
                      <textarea placeholder="What to discuss on follow-up..." value={callForm.followup_notes} onChange={e=>setCallForm({...callForm,followup_notes:e.target.value})} style={{...input,minHeight:60,resize:"vertical"}} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowCallModal(false)} style={{flex:1,padding:13,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:13,borderRadius:10,border:"none",background:C.purple,color:C.white,fontWeight:700,cursor:"pointer",fontSize:14}}>
                  {callForm.schedule_followup?"Log Call & Schedule Follow-up":"Log Call"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
