import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function VoterList() {
  const [voters, setVoters] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const fetchVoters = () => {
    axios.get('/admin/voters').then(r => setVoters(r.data)).catch(() => {});
  };

  useEffect(() => { fetchVoters(); }, []);

  const handleDelete = async (voter_id) => {
    if (!window.confirm(`Delete voter ${voter_id}? This cannot be undone.`)) return;
    setDeleting(voter_id);
    try {
      await axios.delete(`/admin/voter/${voter_id}`);
      fetchVoters();
    } catch (e) {
      alert(e.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
        {voters.length} registered voter{voters.length !== 1 ? 's' : ''}
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Voter ID</th><th>Name</th><th>Roll No.</th><th>Wallet</th><th></th>
          </tr>
        </thead>
        <tbody>
          {voters.map(v => (
            <tr key={v.voter_id}>
              <td className="mono">{v.voter_id}</td>
              <td>{v.name}</td>
              <td className="mono">{v.roll_number}</td>
              <td className="mono" style={{ color: v.eth_address ? 'var(--success)' : 'var(--muted)' }}>
                {v.eth_address ? v.eth_address.slice(0, 14) + '…' : 'Not finalised'}
              </td>
              <td>
                <button
                  onClick={() => handleDelete(v.voter_id)}
                  disabled={deleting === v.voter_id}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  {deleting === v.voter_id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {voters.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '1rem' }}>No voters registered yet.</p>}
    </div>
  );
}