import React, { useState, useEffect } from 'react';
import { logSession, getTemplates, createTemplate, deleteTemplateById, getLastTemplateSession } from '../api';
import toast from 'react-hot-toast';
import ExerciseBlocks, { today, formatDate, emptyBlock, blockFromExercise, blockName, blocksToPayload, labelStyle, fieldStyle } from './ExerciseBlocks';

export default function WorkoutForm({ onLogged, defaultSetCount = 3, showTimeOfDay = true }) {
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
    getTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (!selectedTemplate) { setLastSession(null); return; }
    getLastTemplateSession(Number(selectedTemplate)).then(setLastSession);
  }, [selectedTemplate]);

  const loadTemplate = () => {
    const tpl = templates.find(t => t.id === Number(selectedTemplate));
    if (!tpl) return;
    setBlocks(tpl.exercises.map(name => blockFromExercise(name)));
    setSelectedTemplate('');
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    const exerciseList = blocks.map(blockName).filter(Boolean);
    if (!exerciseList.length) return;
    try {
      await createTemplate({ name, exercises: exerciseList });
      setTemplates(await getTemplates());
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
    setTemplates(await getTemplates());
    setSelectedTemplate('');
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const result = await logSession({
        date,
        timeOfDay: timeOfDay || undefined,
        exercises: blocksToPayload(blocks),
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

        <ExerciseBlocks blocks={blocks} setBlocks={setBlocks} defaultSetCount={defaultSetCount} />

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
