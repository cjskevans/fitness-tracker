import React, { useState, useEffect } from 'react';
import { getSessions, updateSession, deleteSession } from '../api';
import exercises from '../exercises';

const muscleGroups = Object.keys(exercises);
const emptySet = () => ({ reps: '', weight: '' });
const emptyBlock = () => ({ id: Date.now() + Math.random(), muscleGroup: '', exercise: '', customName: '', sets: [emptySet()] });
const isKnownExercise = (name) => muscleGroups.some(g => exercises[g].includes(name));
const today = () => new Date().toISOString().split('T')[0];

const getMuscleGroup = (exerciseName) =>
  muscleGroups.find(g => exercises[g].includes(exerciseName)) || '';

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PAGE_SIZE = 3;

export default function WorkoutHistory({ refreshKey, onChanged }) {
  const [sessions, setSessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = () => getSessions().then(setSessions);

  useEffect(() => { load(); }, [refreshKey]);

  const visible = expanded ? sessions : sessions.slice(0, PAGE_SIZE);

  const startEdit = (session) => {
    setEditingId(session.id);
    setEditForm({
      date: session.date,
      timeOfDay: session.time_of_day || '',
      blocks: session.exercises.map(ex => ({
        id: ex.id,
        muscleGroup: getMuscleGroup(ex.exercise),
        exercise: isKnownExercise(ex.exercise) ? ex.exercise : '__custom__',
        customName: isKnownExercise(ex.exercise) ? '' : ex.exercise,
        sets: ex.sets.map(s => ({ reps: String(s.reps), weight: String(s.weight) })),
      })),
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (sessionId) => {
    try {
      await updateSession(sessionId, {
        date: editForm.date,
        timeOfDay: editForm.timeOfDay || undefined,
        exercises: editForm.blocks.map(b => ({
          exercise: b.exercise === '__custom__' ? b.customName.trim() : b.exercise,
          sets: b.sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })),
        })),
      });
      setEditingId(null);
      setEditForm(null);
      load();
      onChanged();
    } catch {
      alert('Failed to save. Please try again.');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this workout session?')) return;
    await deleteSession(sessionId);
    load();
    onChanged();
  };

  // Edit form helpers
  const addBlock = () => setEditForm(f => ({ ...f, blocks: [...f.blocks, emptyBlock()] }));
  const removeBlock = (i) => setEditForm(f => ({ ...f, blocks: f.blocks.filter((_, idx) => idx !== i) }));
  const updateMuscleGroup = (i, value) =>
    setEditForm(f => ({ ...f, blocks: f.blocks.map((b, idx) => idx === i ? { ...b, muscleGroup: value, exercise: '', customName: '' } : b) }));
  const updateBlock = (i, field, value) =>
    setEditForm(f => ({ ...f, blocks: f.blocks.map((b, idx) => idx === i ? { ...b, [field]: value } : b) }));
  const addSet = (bi) =>
    setEditForm(f => ({ ...f, blocks: f.blocks.map((b, idx) => idx === bi ? { ...b, sets: [...b.sets, emptySet()] } : b) }));
  const removeSet = (bi, si) =>
    setEditForm(f => ({ ...f, blocks: f.blocks.map((b, idx) => idx === bi ? { ...b, sets: b.sets.filter((_, i) => i !== si) } : b) }));
  const updateSet = (bi, si, field, value) =>
    setEditForm(f => ({ ...f, blocks: f.blocks.map((b, idx) => idx === bi
      ? { ...b, sets: b.sets.map((s, i) => i === si ? { ...s, [field]: value } : s) } : b) }));

  if (!sessions.length) return <p style={{ color: '#6b7280' }}>No workouts logged yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {visible.map(session => (
        <div key={session.id} style={entryCard}>

          {editingId === session.id ? (
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={editForm.date} max={today()}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={fieldStyle} />
                </div>
                <div style={{ width: 90 }}>
                  <label style={labelStyle}>Time</label>
                  <select value={editForm.timeOfDay}
                    onChange={e => setEditForm(f => ({ ...f, timeOfDay: e.target.value }))} style={fieldStyle}>
                    <option value="">—</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {editForm.blocks.map((block, bi) => (
                <div key={block.id} style={editBlockCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>Exercise {bi + 1}</span>
                    {editForm.blocks.length > 1 && (
                      <button type="button" onClick={() => removeBlock(bi)} style={removeBlockBtn}>Remove</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Muscle Group</label>
                      <select value={block.muscleGroup} onChange={e => updateMuscleGroup(bi, e.target.value)} style={fieldStyle}>
                        <option value="">Select</option>
                        {muscleGroups.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Exercise</label>
                      <select value={block.exercise} onChange={e => updateBlock(bi, 'exercise', e.target.value)}
                        disabled={!block.muscleGroup} style={fieldStyle}>
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
                          style={{ ...fieldStyle, marginTop: '0.4rem' }}
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ width: 24 }} />
                    <span style={{ ...colHeader, flex: 2 }}>Weight (lbs)</span>
                    <span style={{ ...colHeader, flex: 2 }}>Reps</span>
                    <span style={{ width: 24 }} />
                  </div>
                  {block.sets.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                      <span style={setNumStyle}>{si + 1}</span>
                      <div style={{ flex: 2 }}>
                        <input type="number" min="0.5" step="0.5" value={s.weight} placeholder="lbs"
                          onChange={e => updateSet(bi, si, 'weight', e.target.value)} style={setInputStyle} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <input type="number" min="1" value={s.reps} placeholder="Reps"
                          onChange={e => updateSet(bi, si, 'reps', e.target.value)} style={setInputStyle} />
                      </div>
                      <button type="button" onClick={() => removeSet(bi, si)}
                        disabled={block.sets.length === 1} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addSet(bi)} style={addSetBtnStyle}>+ Add Set</button>
                </div>
              ))}

              <button type="button" onClick={addBlock} style={addExerciseBtnStyle}>+ Add Exercise</button>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => saveEdit(session.id)} style={saveBtnStyle}>Save</button>
                <button onClick={cancelEdit} style={cancelBtnStyle}>Cancel</button>
              </div>
            </div>

          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatDate(session.date)}
                    {session.time_of_day && (
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                        · {session.time_of_day}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#eff6ff', border: '1px dashed #93c5fd', color: '#1d4ed8', borderRadius: 4, padding: '0.15rem 0.5rem' }}>
                    {session.exercises.reduce((n, ex) => n + ex.sets.length, 0)} sets
                    &nbsp;·&nbsp;
                    {session.exercises.reduce((n, ex) => n + ex.sets.reduce((r, s) => r + s.reps, 0), 0)} reps
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                  <button onClick={() => startEdit(session)} style={editBtnStyle}>Edit</button>
                  <button onClick={() => handleDelete(session.id)} style={deleteBtnStyle}>Delete</button>
                </div>
              </div>

              {session.exercises.map(ex => (
                <div key={ex.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#374151' }}>
                    {ex.exercise}
                  </div>
                  <table style={{ fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Set</th>
                        <th style={th}>Weight</th>
                        <th style={th}>Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map(s => (
                        <tr key={s.id}>
                          <td style={td}>{s.set_number}</td>
                          <td style={td}>{s.weight} lbs</td>
                          <td style={td}>{s.reps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {sessions.length > PAGE_SIZE && (
        <button onClick={() => setExpanded(e => !e)} style={seeMoreBtn}>
          {expanded ? 'See less' : `See ${sessions.length - PAGE_SIZE} more`}
        </button>
      )}
    </div>
  );
}

const entryCard = { border: '1px solid var(--border)', borderRadius: 6, padding: '1rem', background: 'var(--surface-alt)' };
const editBlockCard = { border: '1px solid var(--border)', borderRadius: 4, padding: '0.75rem', marginBottom: '0.6rem', background: 'var(--surface)' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--text-secondary)' };
const fieldStyle = { width: '100%', padding: '0.4rem', fontSize: '0.875rem', border: '1px solid var(--border-input)', borderRadius: 4, background: 'var(--surface)', boxSizing: 'border-box' };
const colHeader = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' };
const setNumStyle = { width: 24, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 };
const setInputStyle = { width: '100%', padding: '0.35rem', fontSize: '0.85rem', border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box' };
const removeBtnStyle = { width: 24, height: 30, border: '1px solid var(--border-input)', borderRadius: 4, background: 'var(--surface)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', flexShrink: 0 };
const removeBlockBtn = { padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', background: 'var(--surface)', border: '1px solid #fca5a5', borderRadius: 4, color: '#dc2626' };
const addSetBtnStyle = { padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, color: '#166534', marginTop: '0.2rem' };
const addExerciseBtnStyle = { width: '100%', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: 4, color: '#1d4ed8', marginTop: '0.25rem' };
const saveBtnStyle = { padding: '0.4rem 1rem', fontSize: '0.875rem', cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 };
const cancelBtnStyle = { padding: '0.4rem 1rem', fontSize: '0.875rem', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)', borderRadius: 4 };
const editBtnStyle = { padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' };
const deleteBtnStyle = { padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', background: 'var(--surface)', border: '1px solid #fca5a5', borderRadius: 4, color: '#dc2626' };
const th = { padding: '0.15rem 0.6rem', fontWeight: 500, textAlign: 'left', color: 'var(--text-muted)' };
const td = { padding: '0.15rem 0.6rem' };
const seeMoreBtn = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 4,
  padding: '0.4rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
  color: '#2563eb', width: '100%',
};
