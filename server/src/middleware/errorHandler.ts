import type { NextFunction, Request, Response } from 'express';

interface HttpError extends Error {
  status?: number;
}

// Express only recognises an error handler by its four-parameter arity, so
// `next` must stay in the signature even though it is unused.
export default function errorHandler(err: HttpError, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
}
