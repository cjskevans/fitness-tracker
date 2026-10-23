import React from 'react';
import exercises from '../exercises';

const muscleGroups = Object.keys(exercises);
const emptySet = () => ({ reps: '', weight: '' });
const newId = () => Date.now() + Math.random();

// en-CA formats as YYYY-MM-DD in the browser's timezone; toISOString() would give the UTC date.
export const today = () => new Date().toLocaleDateString('en-CA');

export const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const emptyBlock = (setCount = 1) =>
  ({ id: newId(), muscleGroup: '', exercise: '', customName: '', sets: Array.from({ length: setCount }, emptySet) });

export const blockFromExercise = (name, sets = [emptySet()]) => {
  const group = muscleGroups.find(g => exercises[g].includes(name));
  return group
    ? { id: newId(), muscleGroup: group, exercise: name, customName: '', sets }
    : { id: newId(), muscleGroup: '', exercise: '__custom__', customName: name, sets };
};

export const blockName = (b) => b.exercise === '__custom__' ? b.customName.trim() : b.exercise;

export const blocksToPayload = (blocks) => blocks.map(b => ({
  exercise: blockName(b),
  sets: b.sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })),
}));

// `compact` is the inline edit form in WorkoutHistory: it sits on a tinted card and
// skips `required`, since its Save button is not a form submit.
export default function ExerciseBlocks({ blocks, setBlocks, defaultSetCount = 1, compact = false }) {
  const required = !compact;
  const mapBlock = (bi, fn) => setBlocks(prev => prev.map((b, i) => i === bi ? fn(b) : b));

  const addBlock = () => setBlocks(prev => [...prev, emptyBlock(defaultSetCount)]);
  const removeBlock = (bi) => setBlocks(prev => prev.filter((_, i) => i !== bi));
  const updateBlock = (bi, field, value) => mapBlock(bi, b => ({ ...b, [field]: value }));
  const updateMuscleGroup = (bi, value) => mapBlock(bi, b => ({ ...b, muscleGroup: value, exercise: '', customName: '' }));
  const addSet = (bi) => mapBlock(bi, b => ({ ...b, sets: [...b.sets, emptySet()] }));
  const removeSet = (bi, si) => mapBlock(bi, b => ({ ...b, sets: b.sets.filter((_, i) => i !== si) }));
  const updateSet = (bi, si, field, value) =>
    mapBlock(bi, b => ({ ...b, sets: b.sets.map((s, i) => i === si ? { ...s, [field]: value } : s) }));

  return (
    <>
      {blocks.map((block, bi) => (
        <div key={block.id} style={{ ...blockCard, background: compact ? 'var(--surface)' : 'var(--surface-subtle)' }}>
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
                required={required} style={fieldStyle}>
                <option value="">Select</option>
                {muscleGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Exercise</label>
              <select value={block.exercise} onChange={e => updateBlock(bi, 'exercise', e.target.value)}
                required={required} disabled={!block.muscleGroup} style={fieldStyle}>
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
                  required={required}
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
                  onChange={e => updateSet(bi, si, 'weight', e.target.value)} required={required} style={setInputStyle} />
              </div>
              <div style={{ flex: 2 }}>
                <input type="number" min="1" value={s.reps} placeholder="Reps"
                  onChange={e => updateSet(bi, si, 'reps', e.target.value)} required={required} style={setInputStyle} />
              </div>
              <button type="button" onClick={() => removeSet(bi, si)}
                disabled={block.sets.length === 1} style={removeBtnStyle}>×</button>
            </div>
          ))}

          <button type="button" onClick={() => addSet(bi)} style={addSetBtnStyle}>+ Add Set</button>
        </div>
      ))}

      <button type="button" onClick={addBlock} style={addExerciseBtnStyle}>+ Add Exercise</button>
    </>
  );
}

export const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' };
export const fieldStyle = {
  width: '100%', padding: '0.5rem', fontSize: '0.9rem',
  border: '1px solid var(--border-input)', borderRadius: 4, background: 'var(--surface)', boxSizing: 'border-box',
};
const blockCard = { border: '1px solid var(--border)', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem' };
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
