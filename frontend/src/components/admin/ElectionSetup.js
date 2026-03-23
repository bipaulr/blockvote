import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ethers } from 'ethers';
import deployInfo from '../../utils/deploy-info.json';

async function getContract() {
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  // Switch to Hardhat
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7A69' }] });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x7A69', chainName: 'Hardhat', rpcUrls: ['http://127.0.0.1:8545'], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 } }] });
    }
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(deployInfo.address, deployInfo.abi, signer);
}

export default function ElectionSetup() {
  const [status, setStatus] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New position form
  const [newPosition, setNewPosition] = useState('');
  // New candidate form
  const [candidateName, setCandidateName] = useState('');
  const [candidatePosition, setCandidatePosition] = useState('');
  // New voter address
  const [voterAddress, setVoterAddress] = useState('');

  const fetchStatus = async () => {
    try {
      const [s, p] = await Promise.all([
        axios.get('/blockchain/status'),
        axios.get('/blockchain/positions'),
      ]);
      setStatus(s.data);
      setPositions(p.data);
    } catch {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const tx = async (label, fn) => {
    setLoading(label); setMessage(''); setError('');
    try {
      const contract = await getContract();
      const t = await fn(contract);
      await t.wait();
      setMessage(`✓ ${label} successful`);
      await fetchStatus();
    } catch (e) {
      setError(e.reason || e.message || `${label} failed`);
    } finally { setLoading(''); }
  };

  const openElection = () => tx('Open election', c => c.openElection());
  const closeElection = () => tx('Close election', c => c.closeElection());
  const addPosition = () => {
    if (!newPosition.trim()) return setError('Enter a position name');
    tx('Add position', async c => { const t = await c.addPosition(newPosition.trim()); setNewPosition(''); return t; });
  };
  const addCandidate = () => {
    if (!candidateName.trim() || !candidatePosition.trim()) return setError('Enter candidate name and position');
    tx('Add candidate', async c => { const t = await c.addCandidate(candidateName.trim(), candidatePosition.trim()); setCandidateName(''); return t; });
  };
  const registerVoter = () => {
    if (!voterAddress.trim()) return setError('Enter ETH address');
    tx('Register voter', async c => { const t = await c.registerVoter(voterAddress.trim()); setVoterAddress(''); return t; });
  };

  return (
    <div>
      {/* Election status card */}
      {status && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.2rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              ['Election', status.election_name],
              ['Block', `#${status.block_number}`],
              ['Contract', status.contract_address?.slice(0,16) + '…'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.2rem' }}>{k}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.82rem' }}>{v}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.2rem' }}>Status</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: status.is_open ? 'var(--success)' : 'var(--danger)' }}>
                {status.is_open ? '● Open' : '● Closed'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={openElection}
              disabled={status.is_open || !!loading}
              style={{ opacity: status.is_open ? 0.3 : 1 }}>
              {loading === 'Open election' ? 'Opening…' : 'Open voting'}
            </button>
            <button className="btn-secondary" onClick={closeElection}
              disabled={!status.is_open || !!loading}
              style={{ opacity: !status.is_open ? 0.3 : 1 }}>
              {loading === 'Close election' ? 'Closing…' : 'Close voting'}
            </button>
          </div>
        </div>
      )}

      {message && <div className="success-box" style={{ marginBottom: '1.5rem' }}>{message}</div>}
      {error && <div className="error-box" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Add position */}
        <div>
          <h4 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.1rem', fontWeight: 400, marginBottom: '1rem' }}>Add position</h4>
          <div className="form-group">
            <label>Position title</label>
            <input value={newPosition} placeholder="e.g. President"
              onChange={e => setNewPosition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPosition()} />
          </div>
          <button className="btn-primary" onClick={addPosition} disabled={!!loading}>
            {loading === 'Add position' ? 'Adding…' : 'Add position'}
          </button>

          {/* Current positions */}
          {positions.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.6rem' }}>Current positions</div>
              {positions.map(p => (
                <div key={p.position} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.2rem' }}>{p.position}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {p.candidates.length > 0
                      ? p.candidates.map(c => c.name).join(', ')
                      : 'No candidates yet'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add candidate */}
        <div>
          <h4 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.1rem', fontWeight: 400, marginBottom: '1rem' }}>Add candidate</h4>
          <div className="form-group">
            <label>Candidate name</label>
            <input value={candidateName} placeholder="e.g. Alice Kumar"
              onChange={e => setCandidateName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Position</label>
            <select value={candidatePosition} onChange={e => setCandidatePosition(e.target.value)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTopColor: 'var(--border-dark)', color: 'var(--text)', padding: '0.65rem 0.8rem', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', width: '100%', outline: 'none', borderRadius: 0 }}>
              <option value="">Select position…</option>
              {positions.map(p => <option key={p.position} value={p.position}>{p.position}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={addCandidate} disabled={!!loading}>
            {loading === 'Add candidate' ? 'Adding…' : 'Add candidate'}
          </button>

          {/* Register voter on-chain */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.1rem', fontWeight: 400, marginBottom: '1rem' }}>Register voter on-chain</h4>
            <div className="form-group">
              <label>ETH Address</label>
              <input value={voterAddress} placeholder="0x..."
                onChange={e => setVoterAddress(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={registerVoter} disabled={!!loading}>
              {loading === 'Register voter' ? 'Registering…' : 'Register voter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
