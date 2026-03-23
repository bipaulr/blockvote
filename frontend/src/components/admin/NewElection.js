import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ethers } from 'ethers';

export default function NewElection() {
  const [electionName, setElectionName] = useState('');
  const [positions, setPositions] = useState([{ name: '', candidates: ['', ''] }]);
  const [step, setStep] = useState('form'); // form | deploying | setup | done
  const [deployedAddress, setDeployedAddress] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  const addPosition = () => setPositions(p => [...p, { name: '', candidates: ['', ''] }]);
  const removePosition = (i) => setPositions(p => p.filter((_, idx) => idx !== i));
  const updatePosition = (i, val) => setPositions(p => p.map((pos, idx) => idx === i ? { ...pos, name: val } : pos));
  const addCandidate = (pi) => setPositions(p => p.map((pos, idx) => idx === pi ? { ...pos, candidates: [...pos.candidates, ''] } : pos));
  const removeCandidate = (pi, ci) => setPositions(p => p.map((pos, idx) => idx === pi ? { ...pos, candidates: pos.candidates.filter((_, cidx) => cidx !== ci) } : pos));
  const updateCandidate = (pi, ci, val) => setPositions(p => p.map((pos, idx) => idx === pi ? { ...pos, candidates: pos.candidates.map((c, cidx) => cidx === ci ? val : c) } : pos));

  const handleDeploy = async () => {
    if (!electionName.trim()) return setError('Enter an election name');
    if (positions.some(p => !p.name.trim())) return setError('All positions need a name');
    setError(''); setStep('deploying');

    try {
      // Deploy new contract
      const { data } = await axios.post('/admin/new-election', { election_name: electionName });
      setDeployedAddress(data.contract_address);

      // Now add positions + candidates via contract
      setMessage('Contract deployed. Adding positions and candidates…');

      // Switch to Hardhat
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7A69' }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x7A69', chainName: 'Hardhat', rpcUrls: ['http://127.0.0.1:8545'], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 } }] });
        }
      }

      // Reload deploy-info from backend
      const { data: deployInfo } = await axios.get('/blockchain/deploy-info');
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(deployInfo.address, deployInfo.abi, signer);

      // Add each position and its candidates
      for (const pos of positions) {
        if (!pos.name.trim()) continue;
        setMessage(`Adding position: ${pos.name}…`);
        const t1 = await contract.addPosition(pos.name.trim());
        await t1.wait();
        for (const candidate of pos.candidates) {
          if (!candidate.trim()) continue;
          setMessage(`Adding candidate: ${candidate}…`);
          const t2 = await contract.addCandidate(candidate.trim(), pos.name.trim());
          await t2.wait();
        }
      }

      setStep('done');
      setMessage(`✓ Election "${electionName}" is ready! Go to Manage Election to open voting.`);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Deploy failed');
      setStep('form');
    }
  };

  return (
    <div className="admin-form" style={{ maxWidth: 640 }}>
      <h3>Create new election</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.6 }}>
        This deploys a fresh smart contract and resets the election. All previous votes are archived on the old contract.
      </p>

      {step === 'deploying' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--border)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{message || 'Deploying contract…'}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Confirm each MetaMask popup</p>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div className="success-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p>{message}</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Contract: {deployedAddress}
          </p>
          <button className="btn-secondary" style={{ marginTop: '1rem' }}
            onClick={() => { setStep('form'); setElectionName(''); setPositions([{ name: '', candidates: ['', ''] }]); setMessage(''); }}>
            Create another
          </button>
        </motion.div>
      )}

      {step === 'form' && (
        <>
          <div className="form-group">
            <label>Election name</label>
            <input value={electionName} placeholder="e.g. MEC Student Council Election 2025"
              onChange={e => setElectionName(e.target.value)} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Positions & Candidates
              </label>
              <button className="btn-ghost" onClick={addPosition}>+ Add position</button>
            </div>

            {positions.map((pos, pi) => (
              <motion.div key={pi} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ border: '1px solid var(--border)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'center' }}>
                  <input value={pos.name} placeholder={`Position ${pi + 1} (e.g. President)`}
                    onChange={e => updatePosition(pi, e.target.value)}
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderTopColor: 'var(--border-dark)', color: 'var(--text)', padding: '0.5rem 0.7rem', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
                  {positions.length > 1 && (
                    <button className="btn-ghost" onClick={() => removePosition(pi)} style={{ color: 'var(--danger)' }}>Remove</button>
                  )}
                </div>

                <div style={{ paddingLeft: '0.8rem', borderLeft: '2px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Candidates</div>
                  {pos.candidates.map((c, ci) => (
                    <div key={ci} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <input value={c} placeholder={`Candidate ${ci + 1}`}
                        onChange={e => updateCandidate(pi, ci, e.target.value)}
                        style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.4rem 0.7rem', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
                      {pos.candidates.length > 1 && (
                        <button className="btn-ghost" onClick={() => removeCandidate(pi, ci)} style={{ fontSize: '0.75rem' }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="btn-ghost" onClick={() => addCandidate(pi)} style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    + Add candidate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button className="btn-primary" onClick={handleDeploy}>
            Deploy election →
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.8rem' }}>
            MetaMask will prompt for each transaction. Keep it open.
          </p>
        </>
      )}
    </div>
  );
}
