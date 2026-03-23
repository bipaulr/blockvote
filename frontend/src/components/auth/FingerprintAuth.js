import React, { useState } from 'react';
import axios from 'axios';
import FaceAuth from './FaceAuth';

export default function VoterLogin({ onSuccess }) {
  const [voterId, setVoterId] = useState('');
  const [step, setStep] = useState('id'); // id | face | password
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleIdSubmit = async () => {
    if (!voterId.trim()) return setMessage('Enter your Voter ID');
    setStatus('loading'); setMessage('');
    try {
      await axios.get(`/voter/${voterId.trim()}`);
      setStatus('idle');
      setStep('face');
    } catch (e) {
      setStatus('error');
      setMessage(e.response?.data?.detail || 'Voter ID not found');
    }
  };

  const handlePasswordLogin = async () => {
    if (!password.trim()) return setMessage('Enter your password');
    setStatus('loading'); setMessage('');
    try {
      const { data } = await axios.post('/auth/login', { voter_id: voterId, password });
      setStatus('success');
      setTimeout(() => onSuccess(data), 500);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="auth-page" style={{ maxWidth: 520 }}>

      {/* Step 1 — Voter ID only */}
      {step === 'id' && (
        <>
          <h2>Verify identity</h2>
          <p>Enter your Voter ID to begin face recognition.</p>
          <div className="form-group">
            <label>Voter ID</label>
            <input value={voterId} placeholder="e.g. MEC2024001"
              onChange={e => setVoterId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleIdSubmit()}
              autoFocus />
          </div>
          <button className="btn-primary" onClick={handleIdSubmit}
            disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking…' : 'Continue →'}
          </button>
          {message && <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--danger)' }}>{message}</p>}
        </>
      )}

      {/* Step 2 — Face recognition */}
      {step === 'face' && (
        <>
          <h2>Face recognition</h2>
          <p style={{ marginBottom: '1.2rem' }}>Look directly at the camera. Verification is automatic.</p>
          <FaceAuth
            voterId={voterId}
            onSuccess={onSuccess}
            onFail={() => setStep('password')}
          />
          <button className="btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setStep('password')}>
            Use password instead
          </button>
        </>
      )}

      {/* Step 3 — Password fallback */}
      {step === 'password' && (
        <>
          <h2>Password login</h2>
          <p style={{ marginBottom: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Face recognition failed or unavailable.
          </p>
          <div className="form-group">
            <label>Voter ID</label>
            <input value={voterId} onChange={e => setVoterId(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} placeholder="••••••••"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
              autoFocus />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handlePasswordLogin}
              disabled={status === 'loading'}>
              {status === 'loading' ? 'Verifying…' : 'Login'}
            </button>
            <button className="btn-ghost" onClick={() => setStep('face')}>Try face again</button>
          </div>
          {message && <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--danger)' }}>{message}</p>}
        </>
      )}
    </div>
  );
}