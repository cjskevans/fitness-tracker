import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ProgressChart({ data }) {
  if (!data.length) {
    return <p style={{ color: '#6b7280' }}>No entries logged yet for this exercise.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis unit=" lbs" tick={{ fontSize: 12 }} />
        <Tooltip formatter={(val) => [`${val} lbs`, 'Weight']} />
        <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
