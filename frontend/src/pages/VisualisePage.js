import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const BLOCK_W = 170;
const BLOCK_H = 100;
const GAP = 56;
const ROW_SIZE = 4;
const PADDING = 48;

const TX_COLORS = {
  cast_vote:      { bg: '#0d1f2d', border: '#2196f3', accent: '#2196f3', text: '#90caf9', label: 'Vote cast' },
  open_election:  { bg: '#0d2d0d', border: '#4caf50', accent: '#4caf50', text: '#a5d6a7', label: 'Election opened' },
  close_election: { bg: '#2d0d0d', border: '#f44336', accent: '#f44336', text: '#ef9a9a', label: 'Election closed' },
  register_voter: { bg: '#1a0d2d', border: '#9c27b0', accent: '#9c27b0', text: '#ce93d8', label: 'Voter registered' },
  add_candidate:  { bg: '#2d1a0d', border: '#ff9800', accent: '#ff9800', text: '#ffcc80', label: 'Candidate added' },
  add_position:   { bg: '#2d2d0d', border: '#ffeb3b', accent: '#ffeb3b', text: '#fff59d', label: 'Position added' },
  deploy:         { bg: '#0d0d2d', border: '#673ab7', accent: '#673ab7', text: '#b39ddb', label: 'Contract deployed' },
  transfer:       { bg: '#1a1a1a', border: '#607d8b', accent: '#607d8b', text: '#b0bec5', label: 'Transfer' },
  empty:          { bg: '#111111', border: '#333333', accent: '#444444', text: '#666666', label: 'Empty block' },
  other:          { bg: '#1a1a1a', border: '#455a64', accent: '#455a64', text: '#90a4ae', label: 'Other' },
};

function getPos(index) {
  const col = index % ROW_SIZE;
  const row = Math.floor(index / ROW_SIZE);
  const isEvenRow = row % 2 === 0;
  const x = isEvenRow
    ? PADDING + col * (BLOCK_W + GAP)
    : PADDING + (ROW_SIZE - 1 - col) * (BLOCK_W + GAP);
  const y = PADDING + row * (BLOCK_H + 72);
  return { x, y };
}

function BlockNode({ block, index, onClick, selected, isNew }) {
  const { x, y } = getPos(index);
  const color = TX_COLORS[block.primary_type] || TX_COLORS.other;

  return (
    <motion.g
      initial={isNew ? { opacity: 0, scale: 0.3 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(block)}
    >
      {selected && (
        <rect x={x-4} y={y-4} width={BLOCK_W+8} height={BLOCK_H+8}
          fill="none" stroke={color.accent} strokeWidth="2" rx="6" opacity="0.5"
          style={{ filter: 'blur(3px)' }} />
      )}
      <rect x={x} y={y} width={BLOCK_W} height={BLOCK_H}
        fill={selected ? color.accent : color.bg}
        stroke={color.border} strokeWidth={selected ? 2 : 1} rx="4" />
      <rect x={x} y={y} width={BLOCK_W} height={3} fill={color.accent} rx="2" />

      <text x={x+12} y={y+22} fontFamily="DM Mono,monospace" fontSize="10"
        fill={selected ? '#000' : color.accent} fontWeight="600" letterSpacing="0.05em">
        {block.number === 0 ? 'GENESIS' : `BLOCK #${block.number}`}
      </text>

      <text x={x+12} y={y+40} fontFamily="DM Mono,monospace" fontSize="9"
        fill={selected ? '#333' : color.text} opacity="0.8">
        {block.hash.slice(0,18)}…
      </text>

      <line x1={x+12} y1={y+48} x2={x+BLOCK_W-12} y2={y+48}
        stroke={color.border} strokeWidth="0.5" opacity="0.4" />

      <text x={x+12} y={y+64} fontFamily="DM Sans,sans-serif" fontSize="10"
        fill={selected ? '#111' : color.text} fontWeight="500">
        {color.label}
      </text>

      <text x={x+12} y={y+82} fontFamily="DM Mono,monospace" fontSize="9"
        fill={selected ? '#333' : '#555'}>
        {new Date(block.timestamp * 1000).toLocaleTimeString()} · {block.transactions} tx
      </text>
    </motion.g>
  );
}

function ConnectorLine({ fromIndex, toIndex, fromType }) {
  const from = getPos(fromIndex);
  const to = getPos(toIndex);
  const fromRow = Math.floor(fromIndex / ROW_SIZE);
  const toRow = Math.floor(toIndex / ROW_SIZE);
  const color = (TX_COLORS[fromType] || TX_COLORS.other).accent;

  const fy = from.y + BLOCK_H / 2;
  const ty = to.y + BLOCK_H / 2;

  if (fromRow === toRow) {
    const isEven = fromRow % 2 === 0;
    const x1 = isEven ? from.x + BLOCK_W : from.x;
    const x2 = isEven ? to.x : to.x + BLOCK_W;
    return (
      <motion.line x1={x1} y1={fy} x2={x2} y2={ty}
        stroke={color} strokeWidth="1.5" opacity="0.4" strokeDasharray="5 4"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }}
        transition={{ duration: 0.5 }} />
    );
  }

  const fromIsEven = fromRow % 2 === 0;
  const ex = fromIsEven ? from.x + BLOCK_W : from.x;
  const sx = fromIsEven ? to.x + BLOCK_W : to.x;
  const off = fromIsEven ? 36 : -36;
  return (
    <motion.path
      d={`M ${ex} ${fy} C ${ex+off} ${fy}, ${sx+off} ${ty}, ${sx} ${ty}`}
      fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" strokeDasharray="5 4"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.35 }}
      transition={{ duration: 0.6 }} />
  );
}

export default function VisualisePage() {
  const [blocks, setBlocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newBlockNums, setNewBlockNums] = useState(new Set());
  const [status, setStatus] = useState(null);
  const prevRef = useRef([]);
  const intervalRef = useRef();

  const fetchBlocks = async () => {
    try {
      const [{ data: b }, { data: s }] = await Promise.all([
        axios.get('/blockchain/blocks?count=20'),
        axios.get('/blockchain/status'),
      ]);
      const newNums = new Set(b.filter(x => !prevRef.current.find(p => p.number === x.number)).map(x => x.number));
      if (newNums.size > 0) { setNewBlockNums(newNums); setTimeout(() => setNewBlockNums(new Set()), 1500); }
      prevRef.current = b;
      setBlocks(b);
      setStatus(s);
    } catch {}
  };

  useEffect(() => {
    fetchBlocks();
    intervalRef.current = setInterval(fetchBlocks, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const rows = Math.ceil(blocks.length / ROW_SIZE);
  const svgH = Math.max(300, PADDING * 2 + rows * (BLOCK_H + 72));
  const svgW = PADDING * 2 + ROW_SIZE * (BLOCK_W + GAP) - GAP;
  const selectedColor = selected ? (TX_COLORS[selected.primary_type] || TX_COLORS.other) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2>Chain Visualisation</h2>
        <p className="page-sub">Live Ethereum blockchain — updates every 3s</p>
      </div>

      {status && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', padding: '0.8rem 1rem', background: '#0f0f14', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'DM Mono, monospace', flexWrap: 'wrap' }}>
          {[['Block', `#${status.block_number}`], ['Election', status.election_name], ['Status', status.is_open ? '🟢 Open' : '🔴 Closed'], ['Contract', status.contract_address?.slice(0,16) + '…']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
              <span style={{ color: '#e0e0e0' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4caf50', fontSize: '0.7rem' }}>
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 2 }}>●</motion.span>
            LIVE
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.2rem' }}>
        {Object.entries(TX_COLORS).filter(([k]) => k !== 'other' && k !== 'transfer').map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: color.bg, border: `1px solid ${color.border}`, borderRadius: 4, padding: '0.25rem 0.6rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color.accent, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: color.text, fontFamily: 'DM Mono, monospace' }}>{color.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#0a0a10', borderRadius: '8px', border: '1px solid #1e1e2e', padding: '0.5rem', minHeight: '70vh', overflow: 'hidden' }}>
          {blocks.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#444', fontFamily: 'DM Mono, monospace', fontSize: '0.82rem' }}>Waiting for blocks…</div>
          ) : (
            <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ minHeight: '65vh' }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a24" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {blocks.map((_, i) => i > 0 && (
                <ConnectorLine key={`c-${i}`} fromIndex={i-1} toIndex={i} fromType={blocks[i-1].primary_type} />
              ))}
              {blocks.map((block, i) => (
                <BlockNode key={block.number} block={block} index={i}
                  selected={selected?.number === block.number}
                  isNew={newBlockNums.has(block.number)}
                  onClick={b => setSelected(selected?.number === b.number ? null : b)} />
              ))}
            </svg>
          )}
        </div>

        <AnimatePresence>
          {selected && selectedColor && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              style={{ width: 260, flexShrink: 0, background: '#0f0f14', border: `1px solid ${selectedColor.border}`, borderRadius: '8px', padding: '1.2rem', fontSize: '0.78rem' }}>
              <div style={{ color: selectedColor.accent, fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Block #{selected.number}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: selectedColor.bg, border: `1px solid ${selectedColor.border}`, borderRadius: 4, padding: '0.2rem 0.5rem', marginBottom: '1rem' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: selectedColor.accent, display: 'inline-block' }} />
                <span style={{ fontSize: '0.68rem', color: selectedColor.text, fontFamily: 'DM Mono, monospace' }}>{selectedColor.label}</span>
              </div>
              {[['Hash', selected.hash], ['Parent hash', selected.parentHash], ['Time', new Date(selected.timestamp * 1000).toLocaleString()], ['Transactions', selected.transactions], ['Miner', selected.miner]].map(([k, v]) => (
                <div key={k} style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{k}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', wordBreak: 'break-all', color: '#d0d0d0' }}>{v}</div>
                </div>
              ))}
              <button onClick={() => setSelected(null)}
                style={{ background: 'transparent', border: `1px solid ${selectedColor.border}`, color: selectedColor.text, fontSize: '0.72rem', padding: '0.35rem 0.7rem', cursor: 'pointer', borderRadius: '4px', marginTop: '0.3rem' }}>
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
