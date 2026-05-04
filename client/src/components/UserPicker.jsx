import React, { useState } from 'react';
import { createOrGetUser } from '../api';

export default function UserPicker({ onUser }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    try {
      const user = await createOrGetUser(trimmed);
      localStorage.setItem('ft_user', JSON.stringify(user));
      onUser(user);
    } catch {
      setError('Something went wrong. Try again.');
    }
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>Fitness Tracker</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Enter a username to get started. If you've used one before, entering it again will load your data.
        </p>
        <form onSubmit={submit}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            required
            style={inputStyle}
          />
          <button type="submit" style={btnStyle}>Let's go</button>
          {error && <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)',
};

const card = {
  background: 'var(--surface)', padding: '2.5rem', borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: 340,
};

const inputStyle = {
  display: 'block', width: '100%', padding: '0.6rem',
  fontSize: '1rem', border: '1px solid var(--border-input)', borderRadius: 4,
  marginBottom: '1rem', boxSizing: 'border-box',
};

const btnStyle = {
  width: '100%', padding: '0.6rem', fontSize: '1rem',
  background: '#2563eb', color: '#fff', border: 'none',
  borderRadius: 4, cursor: 'pointer',
};
