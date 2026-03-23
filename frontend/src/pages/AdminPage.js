import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoterRegistration from '../components/admin/VoterRegistration';
import ElectionSetup from '../components/admin/ElectionSetup';
import VoterList from '../components/admin/VoterList';
import NewElection from '../components/admin/NewElection';

const ADMIN_PASSWORD = 'block';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('setup');

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password');
      setInput('');
    }
  };

  if (!authed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 360, paddingTop: '4rem' }}>
        <div className="page-header">
          <h2>Admin</h2>
          <p className="page-sub">Enter password to continue</p>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
            placeholder="••••••••••••"
          />
        </div>
        <button className="btn-primary" onClick={handleLogin}>Enter</button>
        {error && <div className="error-box" style={{ marginTop: '1rem' }}>{error}</div>}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2>Admin</h2>
          <p className="page-sub">Election management</p>
        </div>
        <button className="btn-ghost" onClick={() => setAuthed(false)}>Sign out</button>
      </div>
      <div className="admin-tabs">
        {[['new','New Election'],['setup','Manage Election'],['register','Register Voter'],['voters','Voters']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'new' && <NewElection />}
          {tab === 'setup' && <ElectionSetup />}
          {tab === 'register' && <VoterRegistration />}
          {tab === 'voters' && <VoterList />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
