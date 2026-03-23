import React, { useState } from 'react';
import { motion } from 'framer-motion';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return '0x' + Math.abs(h).toString(16).padStart(8, '0');
}

const GENESIS = [
  { id: 0, data: 'Genesis Block' },
  { id: 1, data: 'Vote: Alice Kumar → President' },
  { id: 2, data: 'Vote: Carol Thomas → Secretary' },
  { id: 3, data: 'Vote: Alice Kumar → President' },
  { id: 4, data: 'Vote: Eve Joseph → Cultural Lead' },
];

function buildChain(blocks) {
  return blocks.map((b, i) => {
    const prev = i === 0 ? '0x00000000' : hash(blocks[i-1].data + (i === 1 ? '0x00000000' : hash(blocks[i-2].data + '0x00000000')));
    const prevHash = i === 0 ? '0x00000000' : hash(blocks[i-1].data + blocks[i-1].prevHash || '0x0');
    return { ...b, prevHash: i === 0 ? '0x00000000' : hash(blocks[i-1].data + (blocks[i-1].prevHash || '0x0')), hash: hash(b.data + (i === 0 ? '0x00000000' : hash(blocks[i-1].data + (blocks[i-1].prevHash || '0x0')))) };
  });
}

function build(raw) {
  const chain = [];
  for (let i = 0; i < raw.length; i++) {
    const prevHash = i === 0 ? '0x00000000' : chain[i-1].hash;
    const h = hash(raw[i].data + prevHash);
    chain.push({ ...raw[i], prevHash, hash: h });
  }
  return chain;
}

export default function TamperSimulator() {
  const [raw, setRaw] = useState(GENESIS.map(b => ({ ...b })));
  const [tampered, setTampered] = useState(null);
  const chain = build(raw);

  const tamperBlock = (idx) => {
    const next = raw.map((b, i) => i === idx ? { ...b, data: 'TAMPERED: Vote: Mallory → President' } : b);
    setRaw(next);
    setTampered(idx);
  };

  const reset = () => { setRaw(GENESIS.map(b => ({ ...b }))); setTampered(null); };

  const isValid = (block, i) => {
    if (i === 0) return true;
    return block.prevHash === chain[i-1].hash;
  };

  return (
    <div className="tamper-section">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <h3>Tamper simulation</h3>
        {tampered !== null && <button className="btn-ghost" onClick={reset}>Reset</button>}
      </div>
      <p>Click any block to tamper with it. Watch how the chain breaks.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 70px', gap: '0 1rem', padding: '0.4rem 0', borderBottom: '2px solid var(--text)' }}>
        {['Block', 'Data', 'Hash', 'Valid'].map(h => (
          <span key={h} style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500 }}>{h}</span>
        ))}
      </div>

      <div className="sim-blocks">
        {chain.map((block, i) => {
          const valid = isValid(block, i);
          return (
            <motion.div key={block.id}
              className={`sim-block-row ${i === 0 ? 'genesis' : ''} ${tampered === i ? 'tampered' : ''} ${!valid ? 'invalid' : ''}`}
              onClick={() => tampered === null && i > 0 && tamperBlock(i)}
              animate={!valid ? { x: [0, -3, 3, 0] } : {}}
              transition={{ duration: 0.3 }}>
              <span className="mono" style={{ fontSize: '0.75rem' }}>#{block.id}</span>
              <span className={`sim-block-data ${tampered === i ? 'tampered-data' : ''}`}>{block.data}</span>
              <span className="sim-hash-pair">{block.hash}</span>
              <span className={`validity ${valid ? 'ok' : 'bad'}`}>{valid ? '✓ valid' : '✗ broken'}</span>
            </motion.div>
          );
        })}
      </div>

      {tampered !== null && (
        <motion.div className="tamper-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Block #{tampered} was tampered — all subsequent hashes are now invalid. This is why blockchain is tamper-proof.
        </motion.div>
      )}
    </div>
  );
}
