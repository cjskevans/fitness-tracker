import React, { useState, useEffect } from 'react';
import { getLastRun } from '../api';

const METERS_PER_MILE = 1609.344;

function clock(totalSeconds) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function LastRun() {
  const [run, setRun] = useState();
  const [error, setError] = useState(null);

  useEffect(() => {
    getLastRun()
      .then(setRun)
      .catch(err => setError(err.response?.data?.error || 'Could not load your last run'));
  }, []);

  if (error) return <p style={muted}>{error}</p>;
  if (run === undefined) return <p style={muted}>Loading…</p>;
  if (!run) return <p style={muted}>No runs found on Garmin Connect</p>;

  const miles = run.distanceMeters / METERS_PER_MILE;
  // Garmin's local time has no offset; swapping in the T makes Date read it as local, not UTC.
  const started = new Date(run.startTimeLocal.replace(' ', 'T'));
  const stats = [
    ['Distance', `${miles.toFixed(2)} mi`],
    ['Time', clock(run.durationSeconds)],
    ['Pace', `${clock(run.durationSeconds / miles)} /mi`],
    run.averageHR && ['Avg HR', `${Math.round(run.averageHR)} bpm`],
    run.elevationGainMeters != null && ['Elevation', `${Math.round(run.elevationGainMeters * 3.28084)} ft`],
    run.calories && ['Calories', Math.round(run.calories)],
  ].filter(Boolean);

  return (
    <div>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{run.name}</div>
      <div style={{ ...muted, marginBottom: '1rem' }}>
        {started.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        {' · '}
        {started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
        {stats.map(([label, value]) => (
          <div key={label}>
            <div style={{ ...muted, fontSize: '0.75rem', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>
      <a
        href={`https://connect.garmin.com/modern/activity/${run.id}`}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.875rem', color: '#2563eb' }}
      >
        View on Garmin Connect
      </a>
    </div>
  );
}

const muted = { color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 };
