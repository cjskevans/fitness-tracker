import React, { useState, useEffect } from 'react';
import { getPRs } from '../api';

export default function PersonalRecords({ userId, refreshKey }) {
  const [prs, setPRs] = useState([]);

  useEffect(() => {
    getPRs(userId).then(setPRs);
  }, [userId, refreshKey]);

  if (!prs.length) {
    return <p style={{ color: '#6b7280' }}>No workouts logged yet.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
          <th style={th}>Exercise</th>
          <th style={th}>Weight</th>
          <th style={th}>Reps</th>
          <th style={th}>Est. 1RM</th>
        </tr>
      </thead>
      <tbody>
        {prs.map(pr => (
          <tr key={pr.exercise} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={td}>{pr.exercise}</td>
            <td style={td}>{pr.weight} lbs</td>
            <td style={td}>{pr.reps}</td>
            <td style={td}>{pr.e1rm} lbs</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = { padding: '0.5rem 0.75rem', fontWeight: 600, color: '#374151' };
const td = { padding: '0.5rem 0.75rem', color: '#111827' };
