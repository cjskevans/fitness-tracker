import React, { useState, useEffect } from 'react';
import WorkoutForm from './components/WorkoutForm';
import ProgressChart from './components/ProgressChart';
import PersonalRecords from './components/PersonalRecords';
import UserPicker from './components/UserPicker';
import { getExercises, getWorkouts } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartData, setChartData] = useState([]);
  const [prRefreshKey, setPrRefreshKey] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('ft_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (user) getExercises(user.id).then(setExercises);
  }, [user]);

  useEffect(() => {
    if (selectedExercise && user) {
      getWorkouts(selectedExercise, user.id).then(setChartData);
    }
  }, [selectedExercise, user]);

  const handleLogged = () => {
    getExercises(user.id).then(setExercises);
    if (selectedExercise) getWorkouts(selectedExercise, user.id).then(setChartData);
    setPrRefreshKey(k => k + 1);
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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Fitness Tracker</h1>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {user.username} &middot;{' '}
          <button onClick={switchUser} style={switchBtn}>Switch user</button>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <WorkoutForm userId={user.id} onLogged={handleLogged} />
        <div>
          <h2 style={{ marginTop: 0 }}>Progress</h2>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            style={{ marginBottom: '1.5rem', padding: '0.5rem', width: '100%', fontSize: '1rem' }}
          >
            <option value="">Select an exercise</option>
            {exercises.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
          {selectedExercise
            ? <ProgressChart data={chartData} />
            : <p style={{ color: '#6b7280' }}>Select an exercise to see your progress.</p>}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2>Personal Records</h2>
        <PersonalRecords userId={user.id} refreshKey={prRefreshKey} />
      </div>
    </div>
  );
}

const switchBtn = {
  background: 'none', border: 'none', color: '#2563eb',
  cursor: 'pointer', padding: 0, fontSize: '0.875rem',
};
