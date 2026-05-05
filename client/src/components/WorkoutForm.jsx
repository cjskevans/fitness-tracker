import React, { useState, useEffect } from 'react';
import { logSession, getTemplates, createTemplate, deleteTemplateById, getLastTemplateSession } from '../api';
import toast from 'react-hot-toast';
import exercises from '../exercises';

const today = () => new Date().toISOString().split('T')[0];
const muscleGroups = Object.keys(exercises);
const emptySet = () => ({ reps: '', weight: '' });
const emptyBlock = (setCount = 1) => ({ id: Date.now() + Math.random(), muscleGroup: '', exercise: '', customName: '', sets: Array.from({ length: setCount }, emptySet) });

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const blockFromExerciseName = (name) => {
  for (const [group, list] of Object.entries(exercises)) {
    if (list.includes(name)) {
      return { id: Date.now() + Math.random(), muscleGroup: group, exercise: name, customName: '', sets: [emptySet()] };
    }
  }
  return { id: Date.now() + Math.random(), muscleGroup: '', exercise: '__custom__', customName: name, sets: [emptySet()] };
};

export default function WorkoutForm({ userId, onLogged, defaultSetCount = 3, showTimeOfDay = true }) {
  const [date, setDate] = useState(today());
  const [timeOfDay, setTimeOfDay] = useState('');
  const [blocks, setBlocks] = useState(() => [emptyBlock(defaultSetCount)]);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateMsg, setTemplateMsg] = useState(null);
  const [showTemplateTip, setShowTemplateTip] = useState(false);
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    getTemplates(userId).then(setTemplates);
  }, [userId]);

  useEffect(() => {
    if (!selectedTemplate) { setLastSession(null); return; }
    getLastTemplateSession(Number(selectedTemplate)).then(setLastSession);
  }, [selectedTemplate]);

  const addBlock = () => setBlocks(prev => [...prev, emptyBlock(defaultSetCount)]);
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

  const loadTemplate = () => {
    const tpl = templates.find(t => t.id === Number(selectedTemplate));
    if (!tpl) return;
    setBlocks(tpl.exercises.map(blockFromExerciseName));
    setSelectedTemplate('');
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    const exerciseList = blocks
      .map(b => b.exercise === '__custom__' ? b.customName.trim() : b.exercise)
      .filter(Boolean);
    if (!exerciseList.length) return;
    try {
      await createTemplate({ userId, name, exercises: exerciseList });
      setTemplates(await getTemplates(userId));
      setTemplateName('');
      setTemplateMsg({ ok: true, msg: `Template "${name}" saved!` });
    } catch {
      setTemplateMsg({ ok: false, msg: 'Failed to save template.' });
    }
    setTimeout(() => setTemplateMsg(null), 3000);
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate) return;
    await deleteTemplateById(Number(selectedTemplate));
    setTemplates(await getTemplates(userId));
    setSelectedTemplate('');
  };

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

      if (result.newPRs?.length > 0) {
        result.newPRs.forEach(p =>
          toast.success(`New PR — ${p.exercise}: ${p.prSet.weight} lbs × ${p.prSet.reps} reps`, { duration: 6000 })
        );
      } else {
        toast.success('Workout logged!');
      }

      setTimeOfDay('');
      setBlocks([emptyBlock(defaultSetCount)]);
      onLogged();
    } catch {
      toast.error('Failed to log workout. Please try again.');
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Log Workout</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.25rem' }}>
        Record the exercises, sets, and weight from your session.
      </p>
      <form onSubmit={submit}>

        {templates.length > 0 && (
          <div className="template-row">
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              style={{ ...fieldStyle, flex: 1, marginBottom: 0 }}
            >
              <option value="">Load a template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" onClick={loadTemplate} disabled={!selectedTemplate} style={loadBtnStyle}>
              Load
            </button>
            <button type="button" onClick={deleteTemplate} disabled={!selectedTemplate} style={deleteTemplateBtnStyle}>
              Delete
            </button>
          </div>
        )}

        {selectedTemplate && (
          <div style={lastSessionCard}>
            {lastSession ? (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Last session — {formatDate(lastSession.date)}{lastSession.time_of_day ? ` (${lastSession.time_of_day})` : ''}
                </div>
                {lastSession.exercises.map(ex => (
                  <div key={ex.exercise} style={{ fontSize: '0.8rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontWeight: 500 }}>{ex.exercise}:</span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {ex.sets.map(s => `${s.weight} × ${s.reps}`).join(',  ')}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No previous session found for this template.</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} max={today()}
              onChange={e => setDate(e.target.value)} required style={fieldStyle} />
          </div>
          {showTimeOfDay && (
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
          )}
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

        <div className="save-template-row">
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name..."
            style={{ ...fieldStyle, flex: 1, marginBottom: 0 }}
          />
          <div style={{ position: 'relative' }}
            onMouseEnter={() => setShowTemplateTip(true)}
            onMouseLeave={() => setShowTemplateTip(false)}>
            <button type="button" onClick={saveAsTemplate} disabled={!templateName.trim()} style={saveTemplateBtnStyle}>
              Save as template
            </button>
            {showTemplateTip && (
              <div style={tooltipStyle}>
                Saves the current exercise list as a named template. Load it later to pre-fill your workout instead of picking exercises from scratch.
              </div>
            )}
          </div>
        </div>
        {templateMsg && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem', color: templateMsg.ok ? '#16a34a' : '#dc2626' }}>
            {templateMsg.msg}
          </p>
        )}

        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" style={submitBtnStyle}>Log Workout</button>
        </div>

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
const loadBtnStyle = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap',
  background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 4, color: '#1d4ed8',
};
const deleteTemplateBtnStyle = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'var(--surface)', border: '1px solid #fca5a5', borderRadius: 4, color: '#dc2626',
};
const saveTemplateBtnStyle = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap',
  background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, color: '#166534',
};
const lastSessionCard = {
  background: 'var(--surface-subtle)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '0.6rem 0.75rem', marginBottom: '1.25rem',
};
const tooltipStyle = {
  position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
  background: '#1f2937', color: '#fff', fontSize: '0.75rem', lineHeight: 1.4,
  padding: '0.4rem 0.6rem', borderRadius: 4, width: 230,
  pointerEvents: 'none', zIndex: 10,
};
