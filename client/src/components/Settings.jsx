import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function Settings({ settings, onSave, onBack }) {
  const [defaultSetCount, setDefaultSetCount] = useState(String(settings.defaultSetCount));
  const [showTimeOfDay, setShowTimeOfDay] = useState(settings.showTimeOfDay);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const save = async () => {
    const count = Math.max(1, Math.min(10, parseInt(defaultSetCount, 10) || 3));
    await onSave({ defaultSetCount: count, showTimeOfDay, darkMode });
    toast.success('Settings saved!');
  };

  return (
    <div>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>Settings</h2>

      <div style={card}>
        <Row label="Default set count" hint="Sets added per exercise when starting a new workout.">
          <input
            type="number"
            min="1"
            max="10"
            value={defaultSetCount}
            onChange={e => setDefaultSetCount(e.target.value)}
            style={numberInput}
          />
        </Row>
        <div style={divider} />
        <Row label="Dark mode" hint="Switch between light and dark colour scheme.">
          <Toggle checked={darkMode} onChange={setDarkMode} />
        </Row>
        <div style={divider} />
        <Row label="Show time of workout" hint="Display the AM / PM dropdown when logging a session.">
          <Toggle checked={showTimeOfDay} onChange={setShowTimeOfDay} />
        </Row>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button onClick={save} style={saveBtn}>Save settings</button>
      </div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
      <div>
        <div style={{ fontWeight: 500, marginBottom: hint ? '0.2rem' : 0 }}>{label}</div>
        {hint && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? '#2563eb' : 'var(--border-input)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s',
        display: 'block',
      }} />
    </button>
  );
}

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0 1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};
const divider = { height: 1, background: 'var(--border)', margin: '0 -1.5rem' };
const backBtn = {
  background: 'none', border: 'none', color: '#2563eb',
  cursor: 'pointer', padding: 0, fontSize: '0.9rem',
};
const saveBtn = {
  padding: '0.6rem 1.4rem', fontSize: '1rem', cursor: 'pointer',
  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4,
};
const numberInput = {
  width: 64, padding: '0.4rem 0.5rem', fontSize: '1rem', textAlign: 'center',
  border: '1px solid var(--border-input)', borderRadius: 4,
  background: 'var(--surface)', color: 'var(--text-primary)',
};
