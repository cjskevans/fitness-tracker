function stripHtml(value) {
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, '').trim();
  if (Array.isArray(value)) return value.map(stripHtml);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripHtml(v)]));
  }
  return value;
}

function sanitize(req, res, next) {
  if (req.body) req.body = stripHtml(req.body);
  next();
}

module.exports = sanitize;
