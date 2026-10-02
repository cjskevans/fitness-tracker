import React, { useState } from 'react';
import { register, login, startDemo } from '../api';

export default function UserPicker({ onUser }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => { setMode(m); setError(''); };

  const signIn = (token, user) => {
    localStorage.setItem('ft_token', token);
    localStorage.setItem('ft_user', JSON.stringify(user));
    onUser(user);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'register' ? register : login;
      const data = await fn(username.trim(), password);
      signIn(data.token, { id: data.userId, username: username.trim() });
    } catch (err) {
      const status = err.response?.status;
      if (mode === 'register' && status === 409) {
        setError('Username already taken.');
      } else if (mode === 'login' && status === 401) {
        setError('Invalid username or password.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const viewDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await startDemo();
      signIn(data.token, { id: data.userId, username: data.username, demo: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>Fitness Tracker</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button onClick={() => switchMode('login')} style={tabBtn(mode === 'login')}>Login</button>
          <button onClick={() => switchMode('register')} style={tabBtn(mode === 'register')}>Register</button>
        </div>
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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '...' : mode === 'register' ? 'Create account' : "Let's go"}
          </button>
          {error && <p style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>{error}</p>}
        </form>
        <button onClick={viewDemo} disabled={loading} style={{ ...btnStyle, ...demoBtn }}>
          View demo
        </button>
      </div>
    </div>
  );
}

const demoBtn = {
  marginTop: '1rem', background: 'var(--surface)', color: '#2563eb',
  border: '1px solid #2563eb',
};

const tabBtn = (active) => ({
  flex: 1, padding: '0.4rem', fontSize: '0.875rem', cursor: 'pointer', borderRadius: 4,
  background: active ? '#2563eb' : 'var(--surface)',
  color: active ? '#fff' : 'var(--text-secondary)',
  border: active ? 'none' : '1px solid var(--border-input)',
  fontWeight: active ? 600 : 400,
});

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
