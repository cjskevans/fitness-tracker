import React, { useState } from 'react';
import { logSession } from '../api';
import exercises from '../exercises';

const today = () => new Date().toISOString().split('T')[0];
const muscleGroups = Object.keys(exercises);
const emptySet = () => ({ reps: '', weight: '' });
const emptyBlock = () => ({ id: Date.now() + Math.random(), muscleGroup: '', exercise: '', customName: '', sets: [emptySet()] });

export default function WorkoutForm({ userId, onLogged }) {
  const [date, setDate] = useState(today());
  const [timeOfDay, setTimeOfDay] = useState('');
  const [blocks, setBlocks] = useState([emptyBlock()]);
  const [status, setStatus] = useState(null);

  const addBlock = () => setBlocks(prev => [...prev, emptyBlock()]);
  const removeBlock = (i) => setBlocks(prev => prev.filter((_, idx) => idx !== i));

  const updateBlock = (i, field, value) =>
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

  const updateMuscleGroup = (i, value) =>
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, muscleGroup: value, exercise: '', customName: '' } : b));

  const addSet = (bi) =>
    setBlocks(prev => prev.map((b, idx) => idx === bi ? { ...b, sets: [...b.sets, emptySet()] } : b));

  const removeSet = (bi, si) =>
    setBlocks(prev => prev.map((b, idx) => idx === bi
      ? { ...b, sets: b.sets.filter((_, i) => i !== si) } : b));

  const updateSet = (bi, si, field, value) =>
    setBlocks(prev => prev.map((b, idx) => idx === bi
      ? { ...b, sets: b.sets.map((s, i) => i === si ? { ...s, [field]: value } : s) } : b));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const result = await logSession({
        userId,
        date,
        timeOfDay: timeOfDay || undefined,
        exercises: blocks.map(b => ({
          exercise: b.exercise === '__custom__' ? b.customName.trim() : b.exercise,
          sets: b.sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })),
        })),
      });

      let msg = 'Workout logged!';
      if (result.newPRs?.length > 0) {
        const list = result.newPRs
          .map(p => `${p.exercise} (${p.prSet.weight} lbs × ${p.prSet.reps})`)
          .join(', ');
        msg = `New PR${result.newPRs.length > 1 ? 's' : ''}! ${list}`;
      }

      setStatus({ ok: true, msg });
      setTimeOfDay('');
      setBlocks([emptyBlock()]);
      onLogged();
    } catch {
      setStatus({ ok: false, msg: 'Error — please try again.' });
    }
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Log Workout</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.25rem' }}>
        Record the exercises, sets, and weight from your session.
      </p>
      <form onSubmit={submit}>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} max={today()}
              onChange={e => setDate(e.target.value)} required style={fieldStyle} />
          </div>
          <div style={{ width: 100 }}>
            <label style={labelStyle}>
              Time <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opt.)</span>
            </label>
            <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} style={fieldStyle}>
              <option value="">—</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        {blocks.map((block, bi) => (
          <div key={block.id} style={blockCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                Exercise {bi + 1}
              </span>
              {blocks.length > 1 && (
                <button type="button" onClick={() => removeBlock(bi)} style={removeBlockBtn}>
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Muscle Group</label>
                <select value={block.muscleGroup} onChange={e => updateMuscleGroup(bi, e.target.value)}
                  required style={fieldStyle}>
                  <option value="">Select</option>
                  {muscleGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Exercise</label>
                <select value={block.exercise} onChange={e => updateBlock(bi, 'exercise', e.target.value)}
                  required disabled={!block.muscleGroup} style={fieldStyle}>
                  <option value="">Select</option>
                  {block.muscleGroup && exercises[block.muscleGroup].map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                  {block.muscleGroup && <option value="__custom__">Other (custom)</option>}
                </select>
                {block.exercise === '__custom__' && (
                  <input
                    type="text"
                    value={block.customName}
                    onChange={e => updateBlock(bi, 'customName', e.target.value)}
                    placeholder="Exercise name"
                    required
                    style={{ ...fieldStyle, marginTop: '0.4rem' }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ width: 28 }} />
              <span style={{ ...colHeader, flex: 2 }}>Weight (lbs)</span>
              <span style={{ ...colHeader, flex: 2 }}>Reps</span>
              <span style={{ width: 28 }} />
            </div>

            {block.sets.map((s, si) => (
              <div key={si} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <span style={setNumStyle}>{si + 1}</span>
                <div style={{ flex: 2 }}>
                  <input type="number" min="0.5" step="0.5" value={s.weight} placeholder="lbs"
                    onChange={e => updateSet(bi, si, 'weight', e.target.value)} required style={setInputStyle} />
                </div>
                <div style={{ flex: 2 }}>
                  <input type="number" min="1" value={s.reps} placeholder="Reps"
                    onChange={e => updateSet(bi, si, 'reps', e.target.value)} required style={setInputStyle} />
                </div>
                <button type="button" onClick={() => removeSet(bi, si)}
                  disabled={block.sets.length === 1} style={removeBtnStyle}>×</button>
              </div>
            ))}

            <button type="button" onClick={() => addSet(bi)} style={addSetBtnStyle}>+ Add Set</button>
          </div>
        ))}

        <button type="button" onClick={addBlock} style={addExerciseBtnStyle}>+ Add Exercise</button>

        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" style={submitBtnStyle}>Log Workout</button>
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
const fieldStyle = {
  width: '100%', padding: '0.5rem', fontSize: '0.9rem',
  border: '1px solid var(--border-input)', borderRadius: 4, background: 'var(--surface)', boxSizing: 'border-box',
};
const blockCard = {
  border: '1px solid var(--border)', borderRadius: 6,
  padding: '1rem', marginBottom: '0.75rem', background: 'var(--surface-subtle)',
};
const colHeader = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' };
const setNumStyle = { width: 28, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0 };
const setInputStyle = {
  width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.9rem',
  border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box',
};
const removeBtnStyle = {
  width: 28, height: 32, border: '1px solid var(--border-input)', borderRadius: 4,
  background: 'var(--surface)', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', flexShrink: 0,
};
const removeBlockBtn = {
  padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer',
  background: 'var(--surface)', border: '1px solid #fca5a5', borderRadius: 4, color: '#dc2626',
};
const addSetBtnStyle = {
  marginTop: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem',
  cursor: 'pointer', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, color: '#166534',
};
const addExerciseBtnStyle = {
  width: '100%', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer',
  background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: 6, color: '#1d4ed8',
};
const submitBtnStyle = {
  padding: '0.6rem 1.4rem', fontSize: '1rem', cursor: 'pointer',
  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4,
};
