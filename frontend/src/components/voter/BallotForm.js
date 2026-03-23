import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function BallotForm({ voter, onSuccess }) {
  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/blockchain/positions').then(r => {
      setPositions(r.data);
      const init = {};
      r.data.forEach(p => init[p.position] = null);
      setSelections(init);
    });
  }, []);

  const selected = Object.values(selections).filter(v => v !== null).length;
  const allSelected = positions.length > 0 && selected === positions.length;

  const handleSubmit = async () => {
    if (!allSelected) return setError('Please vote for all positions');
    setSubmitting(true); setError('');
    try {
      // Backend signs and sends the transaction — no MetaMask needed
      const { data } = await axios.post('/voter/cast-vote', {
        voter_id: voter.voter_id,
        positions: positions.map(p => p.position),
        candidate_ids: positions.map(p => selections[p.position] || 0),
      });
      onSuccess(data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Vote submission failed');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="ballot-voter">Voting as {voter?.name} · {voter?.voter_id}</div>

      {positions.map((pos, i) => (
        <motion.div key={pos.position} className="ballot-position"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}>
          <div className="ballot-position-label">{pos.position}</div>
          <div className="candidate-list">
            {[...pos.candidates, { id: 0, name: 'NOTA' }].map(c => (
              <div key={c.id}
                className={`candidate-option ${selections[pos.position] === c.id ? 'selected' : ''}`}
                onClick={() => setSelections(s => ({ ...s, [pos.position]: c.id }))}>
                <div className="candidate-radio" />
                <span className={`candidate-name ${c.name === 'NOTA' ? 'candidate-nota' : ''}`}>
                  {c.name === 'NOTA' ? 'None of the above' : c.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {error && <div className="error-box">{error}</div>}

      <div className="ballot-submit-row">
        <span className="ballot-count">{selected}/{positions.length} positions filled</span>
        <button className="btn-primary" onClick={handleSubmit} disabled={!allSelected || submitting}>
          {submitting ? 'Recording vote…' : 'Submit ballot'}
        </button>
      </div>
    </div>
  );
}
