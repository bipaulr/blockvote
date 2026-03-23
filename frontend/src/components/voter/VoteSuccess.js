import React from 'react';
import { Link } from 'react-router-dom';

export default function VoteSuccess({ voter }) {
  return (
    <div className="vote-success">
      <div className="success-mark">✓</div>
      <h2>Vote recorded.</h2>
      <p>Your ballot has been permanently written to the Ethereum blockchain.</p>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
        {voter?.voter_id}
      </p>
      <div className="actions">
        <Link to="/blockchain" className="btn-secondary">View on chain</Link>
        <Link to="/" className="btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
