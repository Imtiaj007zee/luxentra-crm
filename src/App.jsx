import React, { useState, useEffect } from 'react';
import { Plus, Phone, CheckCircle, Clock, User, MapPin, Building, Calendar } from 'lucide-react';

export default function LuxentraDashboard() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({});

  // Data persists in browser
  useEffect(() => {
    const saved = { contacts, calls, followUps };
    localStorage.setItem('luxentra_data', JSON.stringify(saved));
  }, [contacts, calls, followUps]);

  useEffect(() => {
    const saved = localStorage.getItem('luxentra_data');
    if (saved) {
      const { contacts: c, calls: ca, followUps: f } = JSON.parse(saved);
      setContacts(c || []);
      setCalls(ca || []);
      setFollowUps(f || []);
    }
  }, []);

  const addContact = (e) => {
    e.preventDefault();
    setContacts([...contacts, { id: Date.now(), ...formData }]);
    setFormData({});
    setShowContactForm(false);
  };

  const addCall = (e) => {
    e.preventDefault();
    setCalls([...calls, {
      id: Date.now(),
      contactId: selectedContact.id,
      ...formData,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setFormData({});
    setShowCallForm(false);
  };

  const addFollowUp = (e) => {
    e.preventDefault();
    setFollowUps([...followUps, {
      id: Date.now(),
      contactId: selectedContact.id,
      ...formData
    }]);
    setFormData({});
    setShowCallForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg">
        <h1 className="text-4xl font-bold">Luxentra Media CRM</h1>
        <p className="text-blue-100">Real Estate Call Tracking & Lead Management</p>
      </div>

      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex gap-1 p-4">
          {['contacts', 'calls', 'followups'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* CONTACTS */}
        {activeTab === 'contacts' && (
          <div>
            <button onClick={() => setShowContactForm(true)}
              className="mb-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
              <Plus size={20} /> Add New Contact
            </button>

            {showContactForm && (
              <div className="mb-6 bg-slate-700 p-6 rounded-lg">
                <form onSubmit={addContact} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" required
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <input type="text" placeholder="Last Name" required
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <input type="email" placeholder="Email" required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <input type="tel" placeholder="Phone" required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <select required value={formData.borough || ''}
                    onChange={(e) => setFormData({...formData, borough: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded">
                    <option value="">Select Borough/Area</option>
                    <option>Manhattan</option>
                    <option>Brooklyn</option>
                    <option>Queens</option>
                    <option>Bronx</option>
                    <option>Staten Island</option>
                    <option>Long Island</option>
                    <option>Westchester</option>
                    <option>Other</option>
                  </select>
                  <input type="text" placeholder="Brokerage" required
                    value={formData.brokerage || ''}
                    onChange={(e) => setFormData({...formData, brokerage: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <button type="submit" className="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-semibold">
                    Add Contact
                  </button>
                </form>
              </div>
            )}

            <div className="grid gap-4">
              {contacts.map(contact => (
                <div key={contact.id} className="bg-slate-700 p-6 rounded-lg">
                  <h3 className="text-xl font-bold text-white">{contact.firstName} {contact.lastName}</h3>
                  <p className="text-slate-300"><Phone size={16} className="inline" /> {contact.phone}</p>
                  <p className="text-slate-400">{contact.email}</p>
                  <p className="text-slate-300"><MapPin size={16} className="inline" /> {contact.borough}</p>
                  <p className="text-slate-300"><Building size={16} className="inline" /> {contact.brokerage}</p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => {setSelectedContact(contact); setActiveTab('calls');}}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Log Call
                    </button>
                    <button onClick={() => {setSelectedContact(contact); setActiveTab('followups');}}
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                      Add Follow-up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALLS */}
        {activeTab === 'calls' && (
          <div>
            {selectedContact && <div className="mb-6 bg-blue-900 p-4 rounded text-white">
              Logging calls for: <strong>{selectedContact.firstName} {selectedContact.lastName}</strong>
            </div>}

            <button onClick={() => selectedContact && setShowCallForm(true)}
              className="mb-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
              <Plus size={20} /> Log New Call
            </button>

            {showCallForm && (
              <div className="mb-6 bg-slate-700 p-6 rounded-lg">
                <form onSubmit={addCall} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select required value={formData.callType || ''}
                    onChange={(e) => setFormData({...formData, callType: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded">
                    <option value="">Call Type</option>
                    <option>Outbound</option>
                    <option>Inbound</option>
                  </select>
                  <input type="text" placeholder="Duration (minutes)"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <select required value={formData.outcome || ''} className="md:col-span-2 bg-slate-600 text-white px-4 py-2 rounded"
                    onChange={(e) => setFormData({...formData, outcome: e.target.value})}>
                    <option value="">Call Outcome</option>
                    <option>Connected</option>
                    <option>Voicemail</option>
                    <option>No Answer</option>
                    <option>Not Interested</option>
                    <option>Interested</option>
                  </select>
                  <textarea placeholder="Notes" className="md:col-span-2 bg-slate-600 text-white px-4 py-2 rounded"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                  <button type="submit" className="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                    Log Call
                  </button>
                </form>
              </div>
            )}

            <div className="grid gap-4">
              {calls.map(call => {
                const contact = contacts.find(c => c.id === call.contactId);
                return (
                  <div key={call.id} className="bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-white">{contact?.firstName} {contact?.lastName}</h3>
                    <p className="text-slate-300"><Calendar size={16} className="inline" /> {call.date} at {call.time}</p>
                    <p className="text-slate-300"><Phone size={16} className="inline" /> {call.callType}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded font-semibold text-white ${
                      call.outcome === 'Interested' ? 'bg-green-600' : call.outcome === 'Not Interested' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>{call.outcome}</span>
                    {call.notes && <p className="mt-3 text-slate-300 bg-slate-600 p-3 rounded">{call.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FOLLOW-UPS */}
        {activeTab === 'followups' && (
          <div>
            {selectedContact && <div className="mb-6 bg-purple-900 p-4 rounded text-white">
              Follow-ups for: <strong>{selectedContact.firstName} {selectedContact.lastName}</strong>
            </div>}

            <button onClick={() => selectedContact && setShowCallForm(true)}
              className="mb-6 flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold">
              <Plus size={20} /> Schedule Follow-up
            </button>

            {showCallForm && (
              <div className="mb-6 bg-slate-700 p-6 rounded-lg">
                <form onSubmit={addFollowUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="date" required
                    value={formData.followUpDate || ''}
                    onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <input type="time"
                    value={formData.followUpTime || ''}
                    onChange={(e) => setFormData({...formData, followUpTime: e.target.value})}
                    className="bg-slate-600 text-white px-4 py-2 rounded" />
                  <textarea placeholder="Notes" className="md:col-span-2 bg-slate-600 text-white px-4 py-2 rounded"
                    value={formData.followUpNotes || ''}
                    onChange={(e) => setFormData({...formData, followUpNotes: e.target.value})} />
                  <button type="submit" className="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                    Schedule Follow-up
                  </button>
                </form>
              </div>
            )}

            <div className="grid gap-4">
              {followUps.map(followUp => {
                const contact = contacts.find(c => c.id === followUp.contactId);
                return (
                  <div key={followUp.id} className="bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-white">{contact?.firstName} {contact?.lastName}</h3>
                    <p className="text-slate-300"><Calendar size={16} className="inline" /> {followUp.followUpDate}</p>
                    <p className="text-slate-300">{followUp.followUpNotes}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
