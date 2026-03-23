import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

function getPositionVerdict(candidates) {
  const total = candidates.reduce((s, c) => s + c.voteCount, 0);
  if (total === 0) return { type: 'no_votes', message: 'No votes cast for this position' };

  const nota = candidates.find(c => c.name === 'NOTA');
  const nonNota = candidates.filter(c => c.name !== 'NOTA');
  const maxVotes = Math.max(...candidates.map(c => c.voteCount));
  const winners = nonNota.filter(c => c.voteCount === maxVotes);
  const notaWins = nota && nota.voteCount === maxVotes;

  if (notaWins && (winners.length === 0 || nota.voteCount > Math.max(...nonNota.map(c => c.voteCount)))) {
    return { type: 'nota_wins', message: 'Majority voted None of the Above — no candidate elected' };
  }
  if (winners.length > 1) {
    return { type: 'tie', message: `Tie between ${winners.map(w => w.name).join(' and ')} — requires re-election` };
  }
  if (winners.length === 1) {
    return { type: 'winner', message: null, winner: winners[0] };
  }
  return { type: 'no_votes', message: 'No votes cast' };
}

export default function ResultsPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/blockchain/status').then(r => {
      setStatus(r.data);
      if (!r.data.is_open && r.data.results_revealed) {
        axios.get('/blockchain/results')
          .then(res => setResults(res.data))
          .catch(e => setError(e.response?.data?.detail || 'Results not available'));
      }
    }).catch(() => setError('Could not connect to blockchain'))
    .finally(() => setLoading(false));
  }, []);

  const byPosition = results?.reduce((acc, c) => {
    if (!acc[c.position]) acc[c.position] = [];
    acc[c.position].push(c);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.82rem', paddingTop: '3rem' }}>
      Loading…
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2>Results</h2>
        <p className="page-sub">{status?.election_name}</p>
      </div>

      {status?.is_open && (
        <div className="results-locked">
          <span className="lock-icon">—</span>
          Election is still open. Results will be available after the admin closes voting.
        </div>
      )}

      {!status?.is_open && !status?.results_revealed && (
        <div className="results-locked">
          <span className="lock-icon">—</span>
          Results are not yet available.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {byPosition && Object.entries(byPosition).map(([position, candidates]) => {
        const total = candidates.reduce((s, c) => s + c.voteCount, 0);
        const verdict = getPositionVerdict(candidates);
        const maxVotes = Math.max(...candidates.map(c => c.voteCount));

        return (
          <div key={position} className="result-group">
            <div className="result-position-label">{position}</div>

            {/* Verdict banner */}
            {verdict.type === 'winner' && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: 'rgba(45,106,79,0.08)', borderLeft: '2px solid var(--success)', fontSize: '0.82rem', color: 'var(--success)' }}>
                ✓ {verdict.winner.name} elected
              </div>
            )}
            {verdict.type === 'tie' && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: 'rgba(244,162,97,0.08)', borderLeft: '2px solid #f4a261', fontSize: '0.82rem', color: '#f4a261' }}>
                ⚖ {verdict.message}
              </div>
            )}
            {verdict.type === 'nota_wins' && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: 'rgba(192,57,43,0.08)', borderLeft: '2px solid var(--danger)', fontSize: '0.82rem', color: 'var(--danger)' }}>
                ✗ {verdict.message}
              </div>
            )}
            {verdict.type === 'no_votes' && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.04)', borderLeft: '2px solid var(--border-dark)', fontSize: '0.82rem', color: 'var(--muted)' }}>
                — {verdict.message}
              </div>
            )}

            {/* Result bars */}
            {[...candidates].sort((a, b) => b.voteCount - a.voteCount).map((c, i) => {
              const pct = total > 0 ? (c.voteCount / total) * 100 : 0;
              const isTied = verdict.type === 'tie' && c.voteCount === maxVotes && c.name !== 'NOTA';
              const isWinner = verdict.type === 'winner' && verdict.winner?.id === c.id;
              const isNota = c.name === 'NOTA';

              return (
                <div key={c.id} className={`result-row ${isWinner ? 'winner' : ''}`}>
                  <div className="result-name">
                    {isNota ? <em>None of the above</em> : c.name}
                    {isWinner && <span className="winner-tag">elected</span>}
                    {isTied && <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f4a261', fontWeight: 500, marginLeft: '0.5rem' }}>tie</span>}
                  </div>
                  <div className="result-bar-wrap">
                    <motion.div className="result-bar-fill"
                      style={{ background: isTied ? '#f4a261' : isNota && verdict.type === 'nota_wins' ? 'var(--danger)' : undefined }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }} />
                  </div>
                  <div className="result-votes">{c.voteCount}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </motion.div>
  );
}