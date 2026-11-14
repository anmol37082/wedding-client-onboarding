const { AppError } = require('./http');

// Small in-memory limiter. For multiple server instances, move this to a shared store.
function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map();
  const cleanup = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, Math.min(windowMs, 60_000));
  cleanup.unref();
  return (req, res, next) => {
    const originalKey = String(key(req)); const now = Date.now();
    let k = originalKey; let e = hits.get(k);
    if (!e && hits.size >= 20_000) {
      for (const [oldKey, value] of hits) if (value.reset < now) hits.delete(oldKey);
      if (hits.size >= 20_000) k = '__rate_limit_overflow__';
      e = hits.get(k);
    }
    if (!e || e.reset < now) { e = { count: 0, reset: now + windowMs }; hits.set(k, e); }
    if (++e.count > max) return next(new AppError(429, 'RATE_LIMITED', message));
    next();
  };
}
module.exports = { rateLimit };
