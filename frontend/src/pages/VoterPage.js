import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import FingerprintAuth from '../components/auth/FingerprintAuth';
import BallotForm from '../components/voter/BallotForm';
import VoteSuccess from '../components/voter/VoteSuccess';

const STEPS = ['auth', 'ballot', 'success'];
const STEP_LABELS = ['Verify identity', 'Cast vote', 'Confirmed'];

export default function VoterPage() {
  const [step, setStep] = useState('auth');
  const [voter, setVoter] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    axios.get('/blockchain/status')
      .then(r => setElectionStatus(r.data))
      .catch(() => setElectionStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  // Election closed — block entire page
  if (statusLoading) {
    return (
      <div style={{ padding: '4rem 0', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.82rem' }}>
        Checking election status…
      </div>
    );
  }

  if (!electionStatus?.is_open) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 420, paddingTop: '3rem' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Voting portal
        </div>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '2rem', fontWeight: 400, marginBottom: '1rem' }}>
          Election is closed
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          {electionStatus
            ? `${electionStatus.election_name} is not currently accepting votes.${electionStatus.results_revealed ? ' Results are available.' : ''}`
            : 'Could not connect to the blockchain. Make sure the backend is running.'}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {electionStatus?.results_revealed && (
            <Link to="/results" className="btn-primary">View results</Link>
          )}
          <Link to="/" className="btn-secondary">Back to home</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2>Voting Portal</h2>
        <div className="steps" style={{ marginTop: '1rem' }}>
          {STEPS.map((s, i) => {
            const current = STEPS.indexOf(step);
            return (
              <React.Fragment key={s}>
                {i > 0 && <span className="step-sep">·</span>}
                <div className={`step-item ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
                  <span className="step-num">{i < current ? '✓' : i + 1}</span>
                  {STEP_LABELS[i]}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <FingerprintAuth onSuccess={(v) => { setVoter(v); setStep('ballot'); }} />
          </motion.div>
        )}
        {step === 'ballot' && (
          <motion.div key="ballot" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <BallotForm voter={voter} onSuccess={() => setStep('success')} />
          </motion.div>
        )}
        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <VoteSuccess voter={voter} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
