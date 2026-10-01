import express from 'express';

const router = express.Router();

// Unauthenticated on purpose: the client polls this while it believes the server
// is unreachable, when the token may be absent or stale.
router.get('/', (req, res) => res.json({ ok: true }));

export default router;
