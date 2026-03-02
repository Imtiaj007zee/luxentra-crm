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
  const deleteAgent = (id) => {
