import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import FaceCapture from '../auth/FaceCapture';

export default function VoterRegistration() {
  const [form, setForm] = useState({ voter_id: '', name: '', roll_number: '' });
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [step, setStep] = useState('details'); // details | face | password | done
  const [createdVoter, setCreatedVoter] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setStep('details'); setMessage(''); setError('');
    setForm({ voter_id: '', name: '', roll_number: '' });
    setPwForm({ password: '', confirm: '' });
    setCreatedVoter(null);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.voter_id || !form.name || !form.roll_number) return setError('Fill in all fields');
    try {
      const { data } = await axios.post('/admin/voter', form);
      setCreatedVoter(data);
      setStep('face');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create voter');
    }
  };

  const handleFaceCapture = async (descriptor) => {
    setError('');
    try {
      await axios.post('/auth/face/register', { voter_id: form.voter_id, descriptor });
      setStep('password');
    } catch (e) {
      setError(e.response?.data?.detail || 'Face registration failed');
    }
  };

  const handleSetPassword = async () => {
    setError('');
    if (!pwForm.password || pwForm.password.length < 4) return setError('Min 4 characters');
    if (pwForm.password !== pwForm.confirm) return setError('Passwords do not match');
    try {
      // Set password
      await axios.post('/auth/register', { voter_id: form.voter_id, password: pwForm.password });
      // Now finalise — generate wallet + register on-chain
      const { data } = await axios.post('/admin/voter/finalise', { voter_id: form.voter_id });
      setCreatedVoter(data);
      setStep('done');
      setMessage(`✓ ${form.name} registered successfully!`);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to complete registration');
    }
  };

  const stepIdx = ['details', 'face', 'password', 'done'].indexOf(step);

  return (
    <div className="admin-form" style={{ maxWidth: 560 }}>

      {/* Step indicator */}
      {step !== 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>
          {['Details', 'Face', 'Password'].map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span style={{ color: 'var(--border-dark)', fontSize: '0.75rem', padding: '0 0.2rem' }}>·</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: i === stepIdx ? 'var(--text)' : i < stepIdx ? 'var(--success)' : 'var(--muted)', fontWeight: i === stepIdx ? 500 : 300 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1px solid ${i === stepIdx ? 'var(--text)' : i < stepIdx ? 'var(--success)' : 'var(--border-dark)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', background: i < stepIdx ? 'var(--success)' : 'transparent', color: i < stepIdx ? '#fff' : 'inherit', flexShrink: 0 }}>
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                {label}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 1 — Details */}
      {step === 'details' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Voter details</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0.4rem 0 1.5rem', lineHeight: 1.6 }}>
            A wallet will be automatically generated and funded for this voter.
          </p>
          {[['voter_id','Voter ID','MEC2024001'],['name','Full Name','John Doe'],['roll_number','Roll Number','21CS001']].map(([key,label,ph]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <input value={form[key]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
          ))}
          <button className="btn-primary" onClick={handleCreate}>Next — Register face →</button>
        </motion.div>
      )}

      {/* Step 2 — Face */}
      {step === 'face' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Face registration — {form.name}</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0.4rem 0 1.2rem', lineHeight: 1.6 }}>
            Ask {form.name} to sit in front of the camera. Position face in the oval, then click capture.
          </p>
          {createdVoter && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '1rem', padding: '0.6rem', background: 'var(--accent-light)', borderLeft: '2px solid var(--border-dark)' }}>
              Wallet generated: {createdVoter.eth_address?.slice(0, 20)}…
            </div>
          )}
          <FaceCapture onCapture={handleFaceCapture} label="Capture face →" instructionText="Centre your face in the oval and stay still." />
          <button className="btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setStep('password')}>Skip — set password only</button>
        </motion.div>
      )}

      {/* Step 3 — Password */}
      {step === 'password' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Backup password — {form.name}</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0.4rem 0 1.5rem', lineHeight: 1.6 }}>
            Used as fallback if face recognition fails.
          </p>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={pwForm.password} placeholder="Min 4 characters"
              onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input type="password" value={pwForm.confirm} placeholder="Repeat password"
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()} />
          </div>
          <button className="btn-primary" onClick={handleSetPassword}>Complete registration →</button>
        </motion.div>
      )}

      {/* Done */}
      {step === 'done' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="success-box">
            <p style={{ fontWeight: 500, marginBottom: '0.3rem' }}>{message}</p>
            <p style={{ fontSize: '0.75rem', fontFamily: 'DM Mono, monospace', marginTop: '0.3rem' }}>
              {form.voter_id} · {form.roll_number}
            </p>
            {createdVoter && (
              <p style={{ fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: 'var(--muted)', marginTop: '0.2rem' }}>
                Wallet: {createdVoter.eth_address?.slice(0, 24)}…
              </p>
            )}
          </div>
          <button className="btn-secondary" style={{ marginTop: '1.2rem' }} onClick={reset}>Register another voter</button>
        </motion.div>
      )}

      {error && <div className="error-box" style={{ marginTop: '1rem' }}>{error}</div>}
    </div>
  );
}
