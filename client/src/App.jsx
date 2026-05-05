import React, { useState, useEffect } from 'react';
import WorkoutForm from './components/WorkoutForm';
import ProgressChart from './components/ProgressChart';
import PersonalRecords from './components/PersonalRecords';
import WorkoutHistory from './components/WorkoutHistory';
import UserPicker from './components/UserPicker';
import Settings from './components/Settings';
import { getExercises, getChartData, getSettings, updateSettings } from './api';
import { Toaster } from 'react-hot-toast';

const defaultSettings = { defaultSetCount: 3, showTimeOfDay: true, darkMode: false };

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(() => ({
    ...defaultSettings,
    darkMode: localStorage.getItem('ft_dark') === 'true',
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartData, setChartData] = useState([]);
  const [prRefreshKey, setPrRefreshKey] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    localStorage.setItem('ft_dark', settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('ft_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!user) return;
    getExercises(user.id).then(setExercises);
    getSettings(user.id).then(setSettings);
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

  const handleSaveSettings = async (newSettings) => {
    await updateSettings(user.id, newSettings);
    setSettings(newSettings);
  };

  const switchUser = () => {
    localStorage.removeItem('ft_user');
    setUser(null);
    setExercises([]);
    setSelectedExercise('');
    setChartData([]);
    setShowSettings(false);
    setSettings({ ...defaultSettings, darkMode: false });
  };

  if (!user) return <UserPicker onUser={setUser} />;

  return (
    <div className="app-container">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      <div className="app-header">
        <h1 style={{ margin: 0 }}>Fitness Tracker</h1>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user.username} &middot;{' '}
          <button onClick={switchUser} style={linkBtn}>Switch user</button>
          &middot;{' '}
          <button onClick={() => setShowSettings(s => !s)} style={linkBtn}>
            {showSettings ? 'Back' : 'Settings'}
          </button>
        </span>
      </div>

      {showSettings ? (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onBack={() => setShowSettings(false)}
        />
      ) : (
        <>
          <div className="main-grid">
            <div style={card}>
              <WorkoutForm
                userId={user.id}
                onLogged={refreshAll}
                defaultSetCount={settings.defaultSetCount}
                showTimeOfDay={settings.showTimeOfDay}
              />
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
        </>
      )}
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

const linkBtn = {
  background: 'none', border: 'none', color: '#2563eb',
  cursor: 'pointer', padding: 0, fontSize: '0.875rem',
};
