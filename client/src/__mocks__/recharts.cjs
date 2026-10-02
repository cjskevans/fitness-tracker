const React = require('react');

const passthrough = ({ children }) => React.createElement('div', null, children);
const noop = () => null;

module.exports = {
  LineChart: passthrough,
  Line: noop,
  XAxis: noop,
  YAxis: noop,
  CartesianGrid: noop,
  Tooltip: noop,
  ResponsiveContainer: passthrough,
};
