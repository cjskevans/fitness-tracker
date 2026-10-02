import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSessions, updateSession, deleteSession } from '../api';
import ExerciseBlocks, { today, formatDate, blockFromExercise, blocksToPayload, labelStyle, fieldStyle } from './ExerciseBlocks';

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
      blocks: session.exercises.map(ex =>
        blockFromExercise(ex.exercise, ex.sets.map(s => ({ reps: String(s.reps), weight: String(s.weight) })))),
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (sessionId) => {
    try {
      await updateSession(sessionId, {
        date: editForm.date,
        timeOfDay: editForm.timeOfDay || undefined,
        exercises: blocksToPayload(editForm.blocks),
      });
      setEditingId(null);
      setEditForm(null);
      load();
      onChanged();
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this workout session?')) return;
    try {
      await deleteSession(sessionId);
      load();
      onChanged();
    } catch {
      toast.error('Failed to delete. Please try again.');
    }
  };

  const setEditBlocks = (update) => setEditForm(f => ({ ...f, blocks: update(f.blocks) }));

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

              <ExerciseBlocks blocks={editForm.blocks} setBlocks={setEditBlocks} compact />

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
