import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState([]);
  const [status, setStatus] = useState(null);
  const [selected, setSelected] = useState(null);
  const ref = useRef();

  const fetch = async () => {
    try {
      const [b, s] = await Promise.all([
        axios.get('/blockchain/blocks?count=10'),
        axios.get('/blockchain/status')
      ]);
      setBlocks(b.data);
      setStatus(s.data);
    } catch {}
  };

  useEffect(() => {
    fetch();
    ref.current = setInterval(fetch, 3000);
    return () => clearInterval(ref.current);
  }, []);

  return (
    <div>
      {status && (
        <div className="chain-status-bar">
          <div className="chain-status-item">
            <span>Latest block</span>
            <span className="chain-status-val mono">#{status.block_number}</span>
          </div>
          <div className="chain-status-item">
            <span>Contract</span>
            <span className="chain-status-val mono">{status.contract_address?.slice(0,14)}…</span>
          </div>
          <div className="chain-status-item">
            <span>Election</span>
            <span className="chain-status-val">{status.is_open ? 'Open' : 'Closed'}</span>
          </div>
          <div className="live-indicator" style={{ marginLeft: 'auto' }}>
            <span className="live-dot" />live
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 50px', gap: '0 1rem', padding: '0.4rem 0', borderBottom: '2px solid var(--text)', marginBottom: '0' }}>
        {['Block', 'Hash', 'Time', 'Tx'].map(h => (
          <span key={h} style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500 }}>{h}</span>
        ))}
      </div>

      <div className="blocks-grid">
        <AnimatePresence>
          {[...blocks].reverse().map(block => (
            <motion.div key={block.number}
              className={`block-row ${selected?.number === block.number ? 'active' : ''}`}
              onClick={() => setSelected(selected?.number === block.number ? null : block)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="block-row-num mono">#{block.number}</span>
              <span className="block-row-hash">{block.hash}</span>
              <span className="block-row-time">{new Date(block.timestamp * 1000).toLocaleTimeString()}</span>
              <span className="block-row-tx">{block.transactions}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div className="block-detail-panel"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}>
            <div className="detail-grid">
              <span className="detail-key">Block</span><span className="detail-val">#{selected.number}</span>
              <span className="detail-key">Hash</span><span className="detail-val">{selected.hash}</span>
              <span className="detail-key">Parent</span><span className="detail-val">{selected.parentHash}</span>
              <span className="detail-key">Time</span><span className="detail-val">{new Date(selected.timestamp * 1000).toLocaleString()}</span>
              <span className="detail-key">Miner</span><span className="detail-val">{selected.miner}</span>
              <span className="detail-key">Tx count</span><span className="detail-val">{selected.transactions}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
