import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function HomePage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get('/blockchain/status').then(r => setStatus(r.data)).catch(() => {});
  }, []);

  return (
    <motion.div className="home-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="hero">
        <div className="hero-eyebrow">Ethereum-based e-voting</div>
        <h1 className="hero-title">
          Voting,<br /><em>on-chain.</em>
        </h1>
        <p className="hero-desc">
          A decentralized election system with biometric authentication and an immutable audit trail.
        </p>
        <div className="hero-actions">
          <Link to="/vote" className="btn-primary">Cast vote</Link>
          <Link to="/blockchain" className="btn-secondary">View chain</Link>
        </div>
        {status && (
          <div className="hero-status">
            <span className={`status-dot ${status.is_open ? 'open' : ''}`} />
            {status.election_name} — {status.is_open ? 'Open' : 'Closed'} · Block #{status.block_number}
          </div>
        )}
      </div>

    </motion.div>
  );
}
