import type { NextFunction, Request, Response } from 'express';

function stripHtml(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, '').trim();
  if (Array.isArray(value)) return value.map(stripHtml);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripHtml(v)]));
  }
  return value;
}

export default function sanitize(req: Request, res: Response, next: NextFunction) {
  if (req.body) req.body = stripHtml(req.body);
  next();
}
