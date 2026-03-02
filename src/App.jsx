import { useState, useEffect } from "react";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "Long Island", "Westchester", "Other"];
const LEAD_SOURCES = ["Redfin", "Zillow", "StreetEasy", "Referral", "Cold Call", "Website", "Other"];
const STATUSES = ["New", "Contacted", "Interested", "Not Interested", "Follow-up", "Closed"];
const OUTCOMES = ["Connected", "Voicemail", "No Answer", "Wrong Number", "Not Interested", "Interested", "Callback Requested"];

function App() {
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState(() => JSON.parse(localStorage.getItem("lux_agents") || "[]"));
  const [calls, setCalls] = useState(() => JSON.parse(localStorage.getItem("lux_calls") || "[]"));
  const [followUps, setFollowUps] = useState(() => JSON.parse(localStorage.getItem("lux_followups") || "[]"));
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewAgent, setViewAgent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [agentForm, setAgentForm] = useState({ firstName: "", lastName: "", phone: "", email: "", brokerage: "", borough: "", leadSource: "", status: "New", notes: "" });
  const [callForm, setCallForm] = useState({ type: "Outbound", outcome: "", duration: "", notes: "" });
  const [followUpForm, setFollowUpForm] = useState({ date: "", time: "", notes: "" });

  useEffect(() => { localStorage.setItem("lux_agents", JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem("lux_calls", JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem("lux_followups", JSON.stringify(followUps)); }, [followUps]);

  const saveAgent = (e) => {
    e.preventDefault();
    const newAgent = { id: Date.now(), ...agentForm, createdAt: new Date().toISOString() };
    setAgents([...agents, newAgent]);
    setAgentForm({ firstName: "", lastName: "", phone: "", email: "", brokerage: "", borough: "", leadSource: "", status: "New", notes: "" });
    setShowAgentModal(false);
  };

  const saveCall = (e) => {
    e.preventDefault();
    const newCall = { id: Date.now(), agentId: selectedAgent.id, agentName: `${selectedAgent.firstName} ${selectedAgent.lastName}`, ...callForm, date: new Date().toISOString() };
    setCalls([...calls, newCall]);
    setCallForm({ type: "Outbound", outcome: "", duration: "", notes: "" });
    setShowCallModal(false);
  };

  const saveFollowUp = (e) => {
    e.preventDefault();
    const newFU = { id: Date.now(), agentId: selectedAgent.id, agentName: `${selectedAgent.firstName} ${selectedAgent.lastName}`, phone: selectedAgent.phone, brokerage: selectedAgent.brokerage, ...followUpForm, completed: false };
    setFollowUps([...followUps, newFU]);
    setFollowUpForm({ date: "", time: "", notes: "" });
    setShowFollowUpModal(false);
  };

  const completeFollowUp = (id) => setFollowUps(followUps.map(f => f.id === id ? { ...f, completed: true } : f));
  const deleteAgent = (id) => { setAgents(agents.filter(a => a.id !== id)); setViewAgent(null); };

  const isOverdue = (dateStr) => new Date(dateStr) < new Date();
  const thisWeekCalls = calls.filter(c => new Date(c.date) > new Date(Date.now() - 7 * 86400000)).length;
  const pendingFU = followUps.filter(f => !f.completed).length;

  const filteredAgents = agents.filter(a => {
    const name = `${a.firstName} ${a.lastName} ${a.brokerage}`.toLowerCase();
    return name.includes(search.toLowerCase()) &&
      (filterStatus === "All" || a.status === filterStatus) &&
      (filterSource === "All" || a.leadSource === filterSource);
  });

  const statusColor = (s) => ({ New: "bg-blue-100 text-blue-700", Contacted: "bg-yellow-100 text-yellow-700", Interested: "bg-green-100 text-green-700", "Not Interested": "bg-red-100 text-red-700", "Follow-up": "bg-purple-100 text-purple-700", Closed: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100 text-gray-600");

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f8f9fb" }}>
      {/* NAV */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>LuxEntra Data</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["dashboard","Dashboard"], ["agents","Agents"], ["calls","Calls"], ["followups","Follow-ups"]].map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: page === id ? "#f3f0ff" : "transparent", color: page === id ? "#7c3aed" : "#555", fontWeight: page === id ? 700 : 500, cursor: "pointer", fontSize: 14 }}>{label}</button>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
            <p style={{ color: "#888", marginBottom: 32 }}>Your cold calling performance overview</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
              {[
                { label: "Total Agents", value: agents.length, sub: "Active contacts in database", icon: "👥" },
                { label: "Total Calls", value: calls.length, sub: "All time call log entries", icon: "📞" },
                { label: "Pending Follow-ups", value: pendingFU, sub: "Scheduled callbacks remaining", icon: "📅" },
                { label: "Calls This Week", value: thisWeekCalls, sub: "Last 7 days activity", icon: "📈" },
              ].map(({ label, value, sub, icon }) => (
                <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: "#888", fontSize: 14, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 6 }}>{value}</div>
                  <div style={{ color: "#aaa", fontSize: 13 }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #eee" }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Recent Calls</h3>
                {calls.length === 0 ? <p style={{ color: "#aaa" }}>No calls logged yet.</p> : calls.slice(-5).reverse().map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.agentName}</div>
                      <div style={{ color: "#aaa", fontSize: 12 }}>{c.type} · {new Date(c.date).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: c.outcome === "Interested" ? "#dcfce7" : c.outcome === "Not Interested" ? "#fee2e2" : "#fef9c3", color: c.outcome === "Interested" ? "#15803d" : c.outcome === "Not Interested" ? "#b91c1c" : "#854d0e", fontWeight: 600, alignSelf: "center" }}>{c.outcome}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #eee" }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Upcoming Follow-ups</h3>
                {followUps.filter(f => !f.completed).length === 0 ? <p style={{ color: "#aaa" }}>No pending follow-ups.</p> : followUps.filter(f => !f.completed).slice(0, 5).map(f => (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.agentName}</div>
                      <div style={{ color: "#aaa", fontSize: 12 }}>{f.date} {f.time && `at ${f.time}`}</div>
                    </div>
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: isOverdue(f.date) ? "#fee2e2" : "#ede9fe", color: isOverdue(f.date) ? "#b91c1c" : "#7c3aed", fontWeight: 600, alignSelf: "center" }}>{isOverdue(f.date) ? "Overdue" : "Upcoming"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AGENTS */}
        {page === "agents" && !viewAgent && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>Agents</h1>
                <p style={{ color: "#888" }}>Manage your real estate contacts</p>
              </div>
              <button onClick={() => setShowAgentModal(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 30, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>+ Add Agent</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input placeholder="Search by name, brokerage..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "10px 16px", borderRadius: 30, border: "1px solid #e5e5e5", fontSize: 14, width: 260, outline: "none" }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "10px 16px", borderRadius: 30, border: "1px solid #e5e5e5", fontSize: 14, outline: "none" }}>
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ padding: "10px 16px", borderRadius: 30, border: "1px solid #e5e5e5", fontSize: 14, outline: "none" }}>
                <option value="All">All Sources</option>
                {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>Showing {filteredAgents.length} of {agents.length} agents</p>
            <div style={{ display: "grid", gap: 14 }}>
              {filteredAgents.length === 0 ? <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: "#aaa", border: "1px solid #eee" }}>No agents found. Add one to get started!</div> :
                filteredAgents.map(a => (
                  <div key={a.id} onClick={() => setViewAgent(a)} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #eee", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 17 }}>{a.firstName} {a.lastName}</span>
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }} className={statusColor(a.status)}>{a.status}</span>
                      </div>
                      <div style={{ color: "#666", fontSize: 14, display: "flex", gap: 20 }}>
                        <span>📞 {a.phone}</span>
                        {a.email && <span>✉️ {a.email}</span>}
                        {a.borough && <span>📍 {a.brokerage} · {a.borough}</span>}
                      </div>
                    </div>
                    {a.leadSource && <div style={{ textAlign: "right" }}><div style={{ color: "#aaa", fontSize: 12 }}>Lead Source</div><div style={{ fontWeight: 700, fontSize: 14 }}>{a.leadSource}</div></div>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AGENT DETAIL */}
        {page === "agents" && viewAgent && (
          <div>
            <button onClick={() => setViewAgent(null)} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", fontSize: 15, marginBottom: 20 }}>← Back to Agents</button>
            <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #eee", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{viewAgent.firstName} {viewAgent.lastName}</h2>
                  <span style={{ fontSize: 13, padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>{viewAgent.status}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setSelectedAgent(viewAgent); setShowCallModal(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>📞 Log Call</button>
                  <button onClick={() => { setSelectedAgent(viewAgent); setShowFollowUpModal(true); }} style={{ background: "#ede9fe", color: "#7c3aed", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>📅 Follow-up</button>
                  <button onClick={() => deleteAgent(viewAgent.id)} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>🗑 Delete</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 24 }}>
                {[["Phone", viewAgent.phone], ["Email", viewAgent.email || "—"], ["Brokerage", viewAgent.brokerage || "—"], ["Borough", viewAgent.borough || "—"], ["Lead Source", viewAgent.leadSource || "—"], ["Added", new Date(viewAgent.createdAt).toLocaleDateString()]].map(([k, v]) => (
                  <div key={k}><div style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>{k}</div><div style={{ fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
              {viewAgent.notes && <div style={{ marginTop: 20, background: "#f8f9fb", borderRadius: 10, padding: 16 }}><div style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>Notes</div><div>{viewAgent.notes}</div></div>}
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Call History</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {calls.filter(c => c.agentId === viewAgent.id).length === 0 ? <div style={{ color: "#aaa", background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #eee" }}>No calls logged yet.</div> :
                calls.filter(c => c.agentId === viewAgent.id).reverse().map(c => (
                  <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.type} Call · {new Date(c.date).toLocaleDateString()} at {new Date(c.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      {c.duration && <div style={{ color: "#888", fontSize: 13 }}>Duration: {c.duration} mins</div>}
                      {c.notes && <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{c.notes}</div>}
                    </div>
                    <span style={{ fontSize: 13, padding: "4px 12px", borderRadius: 20, background: c.outcome === "Interested" ? "#dcfce7" : c.outcome === "Not Interested" ? "#fee2e2" : "#fef9c3", color: c.outcome === "Interested" ? "#15803d" : c.outcome === "Not Interested" ? "#b91c1c" : "#854d0e", fontWeight: 600, alignSelf: "center" }}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CALLS */}
        {page === "calls" && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Calls</h1>
            <p style={{ color: "#888", marginBottom: 24 }}>All call activity across your agents</p>
            <div style={{ display: "grid", gap: 12 }}>
              {calls.length === 0 ? <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: "#aaa", border: "1px solid #eee" }}>No calls logged yet. Go to an agent and log a call!</div> :
                [...calls].reverse().map(c => (
                  <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: "18px 24px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.agentName}</div>
                      <div style={{ color: "#888", fontSize: 13 }}>📞 {c.type} · {new Date(c.date).toLocaleDateString()} at {new Date(c.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{c.duration ? ` · ${c.duration} mins` : ""}</div>
                      {c.notes && <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{c.notes}</div>}
                    </div>
                    <span style={{ fontSize: 13, padding: "5px 14px", borderRadius: 20, background: c.outcome === "Interested" ? "#dcfce7" : c.outcome === "Not Interested" ? "#fee2e2" : "#fef9c3", color: c.outcome === "Interested" ? "#15803d" : c.outcome === "Not Interested" ? "#b91c1c" : "#854d0e", fontWeight: 600 }}>{c.outcome}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* FOLLOW-UPS */}
        {page === "followups" && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Follow-ups</h1>
            <p style={{ color: "#888", marginBottom: 24 }}>Scheduled callbacks and follow-up tasks</p>
            <div style={{ display: "grid", gap: 12 }}>
              {followUps.filter(f => !f.completed).length === 0 ? <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: "#aaa", border: "1px solid #eee" }}>No pending follow-ups!</div> :
                followUps.filter(f => !f.completed).map(f => (
                  <div key={f.id} style={{ background: isOverdue(f.date) ? "#fff8f8" : "#fff", borderRadius: 14, padding: "20px 24px", border: `1px solid ${isOverdue(f.date) ? "#fecaca" : "#eee"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{f.agentName}</span>
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: isOverdue(f.date) ? "#fee2e2" : "#ede9fe", color: isOverdue(f.date) ? "#b91c1c" : "#7c3aed", fontWeight: 600 }}>{isOverdue(f.date) ? "Overdue" : "Upcoming"}</span>
                      </div>
                      <div style={{ color: "#666", fontSize: 13, display: "flex", gap: 16 }}>
                        <span>📅 {new Date(f.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{f.time && ` at ${f.time}`}</span>
                        {f.phone && <span>📞 {f.phone}</span>}
                        {f.brokerage && <span>🏢 {f.brokerage}</span>}
                      </div>
                      {f.notes && <div style={{ color: "#888", fontSize: 13, marginTop: 6 }}>{f.notes}</div>}
                    </div>
                    <button onClick={() => completeFollowUp(f.id)} style={{ background: "#f5f5f5", border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>✓ Complete</button>
                  </div>
                ))}
              {followUps.filter(f => f.completed).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ color: "#aaa", fontSize: 14, marginBottom: 10 }}>Completed ({followUps.filter(f => f.completed).length})</h3>
                  {followUps.filter(f => f.completed).map(f => (
                    <div key={f.id} style={{ background: "#f8f9fb", borderRadius: 14, padding: "16px 24px", border: "1px solid #eee", marginBottom: 8, opacity: 0.6 }}>
                      <span style={{ fontWeight: 600 }}>{f.agentName}</span> · <span style={{ color: "#aaa", fontSize: 13 }}>{f.date}</span>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div><h2 style={{ fontWeight: 800, fontSize: 22 }}>Add New Agent</h2><p style={{ color: "#888", fontSize: 14 }}>Add a new real estate agent to your contact list</p></div>
              <button onClick={() => setShowAgentModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <form onSubmit={saveAgent}>
              {[["First Name", "firstName", "text", "e.g., Sarah", true], ["Last Name", "lastName", "text", "e.g., Johnson", true], ["Phone Number", "phone", "tel", "(212) 555-0123", true], ["Email", "email", "email", "agent@brokerage.com", false], ["Brokerage", "brokerage", "text", "e.g., RE/MAX Premier", false]].map(([label, key, type, ph, req]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>{label} {req && "*"}</label>
                  <input type={type} placeholder={ph} required={req} value={agentForm[key]} onChange={e => setAgentForm({ ...agentForm, [key]: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              {[["Borough / Area", "borough", BOROUGHS, "Select borough"], ["Lead Source", "leadSource", LEAD_SOURCES, "Select lead source"], ["Status", "status", STATUSES, "Select status"]].map(([label, key, opts, ph]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>{label}</label>
                  <select value={agentForm[key]} onChange={e => setAgentForm({ ...agentForm, [key]: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", background: "#f8f9fb" }}>
                    <option value="">{ph}</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Notes</label>
                <textarea placeholder="Add any relevant notes about this agent..." value={agentForm.notes} onChange={e => setAgentForm({ ...agentForm, notes: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowAgentModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #e5e5e5", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Add Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG CALL MODAL */}
      {showCallModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22 }}>Log Call — {selectedAgent?.firstName} {selectedAgent?.lastName}</h2>
              <button onClick={() => setShowCallModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={saveCall}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Call Type</label>
                <select value={callForm.type} onChange={e => setCallForm({ ...callForm, type: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", background: "#f8f9fb" }}>
                  <option>Outbound</option><option>Inbound</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Outcome *</label>
                <select required value={callForm.outcome} onChange={e => setCallForm({ ...callForm, outcome: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", background: "#f8f9fb" }}>
                  <option value="">Select outcome</option>
                  {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Duration (minutes)</label>
                <input type="number" placeholder="e.g., 5" value={callForm.duration} onChange={e => setCallForm({ ...callForm, duration: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Notes</label>
                <textarea placeholder="What happened on the call?" value={callForm.notes} onChange={e => setCallForm({ ...callForm, notes: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowCallModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #e5e5e5", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Log Call</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL */}
      {showFollowUpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22 }}>Schedule Follow-up — {selectedAgent?.firstName} {selectedAgent?.lastName}</h2>
              <button onClick={() => setShowFollowUpModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={saveFollowUp}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Date *</label>
                <input type="date" required value={followUpForm.date} onChange={e => setFollowUpForm({ ...followUpForm, date: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Time</label>
                <input type="time" value={followUpForm.time} onChange={e => setFollowUpForm({ ...followUpForm, time: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Notes</label>
                <textarea placeholder="Reason for follow-up..." value={followUpForm.notes} onChange={e => setFollowUpForm({ ...followUpForm, notes: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 14, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowFollowUpModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #e5e5e5", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
