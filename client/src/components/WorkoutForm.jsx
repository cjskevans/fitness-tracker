import React, { useState } from 'react';
import { logWorkout } from '../api';
import exercises from '../exercises';

const today = () => new Date().toISOString().split('T')[0];
const muscleGroups = Object.keys(exercises);
const emptySet = () => ({ reps: '', weight: '' });

const inputStyle = {
  padding: '0.5rem',
  fontSize: '1rem',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  width: '100%',
};

const selectStyle = {
  ...inputStyle,
  display: 'block',
  marginBottom: '1rem',
  background: '#fff',
};

export default function WorkoutForm({ userId, onLogged }) {
  const [date, setDate] = useState(today());
  const [timeOfDay, setTimeOfDay] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState([emptySet()]);
  const [status, setStatus] = useState(null);

  const handleMuscleGroupChange = (e) => {
    setMuscleGroup(e.target.value);
    setExercise('');
  };

  const updateSet = (index, field, value) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSet = () => setSets(prev => [...prev, emptySet()]);

  const removeSet = (index) => setSets(prev => prev.filter((_, i) => i !== index));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const result = await logWorkout({
        date,
        timeOfDay: timeOfDay || undefined,
        exercise,
        userId,
        sets: sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })),
      });
      const msg = result.newPR
        ? `New personal record! ${result.prSet.weight} lbs x ${result.prSet.reps} reps`
        : 'Logged!';
      setStatus({ ok: true, msg });
      setTimeOfDay('');
      setMuscleGroup('');
      setExercise('');
      setSets([emptySet()]);
      onLogged();
    } catch {
      setStatus({ ok: false, msg: 'Error — please try again.' });
    }
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Log Workout</h2>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={e => setDate(e.target.value)}
              required
              style={{ ...selectStyle, marginBottom: 0 }}
            />
          </div>
          <div style={{ width: 100 }}>
            <label style={labelStyle}>Time <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <select
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
              style={{ ...selectStyle, marginBottom: 0 }}
            >
              <option value="">—</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Muscle Group</label>
        <select value={muscleGroup} onChange={handleMuscleGroupChange} required style={selectStyle}>
          <option value="">Select muscle group</option>
          {muscleGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <label style={labelStyle}>Exercise</label>
        <select
          value={exercise}
          onChange={e => setExercise(e.target.value)}
          required
          disabled={!muscleGroup}
          style={selectStyle}
        >
          <option value="">Select exercise</option>
          {muscleGroup && exercises[muscleGroup].map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>

        <label style={labelStyle}>Sets</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={colHeader}>Set</span>
          <span style={{ ...colHeader, flex: 2 }}>Weight (lbs)</span>
          <span style={{ ...colHeader, flex: 2 }}>Reps</span>
          <span style={{ width: 28 }} />
        </div>

        {sets.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <span style={{ width: 28, textAlign: 'center', fontWeight: 600, color: '#6b7280', fontSize: '0.9rem' }}>
              {i + 1}
            </span>
            <div style={{ flex: 2 }}>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={s.weight}
                onChange={e => updateSet(i, 'weight', e.target.value)}
                required
                style={inputStyle}
                placeholder="lbs"
              />
            </div>
            <div style={{ flex: 2 }}>
              <input
                type="number"
                min="1"
                value={s.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                required
                style={inputStyle}
                placeholder="Reps"
              />
            </div>
            <button
              type="button"
              onClick={() => removeSet(i)}
              disabled={sets.length === 1}
              style={removeBtn}
              title="Remove set"
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" onClick={addSet} style={addSetBtn}>+ Add Set</button>

        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" style={submitBtn}>Log Workout</button>
        </div>

        {status && (
          <p style={{ marginTop: '0.75rem', color: status.ok ? '#16a34a' : '#dc2626' }}>
            {status.msg}
          </p>
        )}
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' };
const colHeader = { flex: 2, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const removeBtn = {
  width: 28, height: 34, border: '1px solid #d1d5db', borderRadius: 4,
  background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const addSetBtn = {
  marginTop: '0.25rem', padding: '0.4rem 0.9rem', fontSize: '0.875rem',
  cursor: 'pointer', background: '#dcfce7', border: '1px solid #86efac',
  borderRadius: 4, color: '#166534',
};
const submitBtn = {
  padding: '0.6rem 1.4rem', fontSize: '1rem', cursor: 'pointer',
  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4,
};
