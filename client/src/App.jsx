import React, { useState, useEffect } from 'react';
import WorkoutForm from './components/WorkoutForm';
import ProgressChart from './components/ProgressChart';
import PersonalRecords from './components/PersonalRecords';
import WorkoutHistory from './components/WorkoutHistory';
import UserPicker from './components/UserPicker';
import { getExercises, getChartData } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartData, setChartData] = useState([]);
  const [prRefreshKey, setPrRefreshKey] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ft_dark') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('ft_dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('ft_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (user) getExercises(user.id).then(setExercises);
  }, [user]);

  useEffect(() => {
    if (selectedExercise && user) {
      getChartData(selectedExercise, user.id).then(setChartData);
    }
  }, [selectedExercise, user]);

  const refreshAll = () => {
    getExercises(user.id).then(setExercises);
    if (selectedExercise) getChartData(selectedExercise, user.id).then(setChartData);
    setPrRefreshKey(k => k + 1);
    setHistoryRefreshKey(k => k + 1);
  };

  const switchUser = () => {
    localStorage.removeItem('ft_user');
    setUser(null);
    setExercises([]);
    setSelectedExercise('');
    setChartData([]);
  };

  if (!user) return <UserPicker onUser={setUser} />;

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 style={{ margin: 0 }}>Fitness Tracker</h1>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user.username} &middot;{' '}
          <button onClick={switchUser} style={switchBtn}>Switch user</button>
          &middot;{' '}
          <button onClick={() => setDarkMode(d => !d)} style={toggleBtn}>
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </span>
      </div>

      <div className="main-grid">
        <div style={card}>
          <WorkoutForm userId={user.id} onLogged={refreshAll} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Progress Chart</h2>
          <p style={desc}>Select an exercise to see your max weight over time.</p>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            style={{ marginBottom: '1.5rem', padding: '0.5rem', width: '100%', fontSize: '1rem', border: '1px solid var(--border-input)', borderRadius: 4 }}
          >
            <option value="">Select an exercise</option>
            {exercises.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
          {selectedExercise && <ProgressChart data={chartData} />}
        </div>
      </div>

      <div style={{ ...card, marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Personal Records</h2>
        <p style={desc}>Your best set for each exercise, ranked by weight then reps.</p>
        <PersonalRecords userId={user.id} refreshKey={prRefreshKey} />
      </div>

      <div style={{ ...card, marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Workout History</h2>
        <p style={desc}>Browse, edit, or delete your past workout sessions.</p>
        <WorkoutHistory userId={user.id} refreshKey={historyRefreshKey} onChanged={refreshAll} />
      </div>
    </div>
  );
}

const desc = {
  fontSize: '0.875rem', color: 'var(--text-muted)',
  marginTop: '-0.5rem', marginBottom: '1.25rem',
};

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const switchBtn = {
  background: 'none', border: 'none', color: '#2563eb',
  cursor: 'pointer', padding: 0, fontSize: '0.875rem',
};

const toggleBtn = {
  background: 'none', border: '1px solid var(--border)',
  borderRadius: 20, padding: '0.15rem 0.6rem',
  fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)',
};
