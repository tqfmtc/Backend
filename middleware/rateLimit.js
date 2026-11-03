// Minimal in-memory rate limiter (single pm2 instance, so memory is shared by all requests).
// Keyed by the account being tried (phone/email), not by IP: behind a reverse proxy every
// request can arrive from the same IP, which would lock everyone out together.
const buckets = new Map();

// Drop expired buckets so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(key);
  }
}, 60 * 1000).unref();

export const rateLimit = ({ name, windowMs, max, key, message = 'Too many attempts. Please try again later.' }) => {
  return (req, res, next) => {
    const id = key(req);
    if (!id) return next();

    const bucketKey = `${name}:${id}`;
    const now = Date.now();
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(bucketKey, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      res.set('Retry-After', Math.ceil((bucket.reset - now) / 1000));
      return res.status(429).json({ message });
    }
    next();
  };
};

// Logins send phone/email; the forgot-password form sends tutorNumber/tutorMail
const identifier = (req) => {
  const b = req.body || {};
  return String(b.phone || b.email || b.tutorNumber || b.tutorMail || '').trim().toLowerCase();
};

// 10 login attempts per account per 15 minutes
export const loginLimiter = (name) => rateLimit({ name, windowMs: 15 * 60 * 1000, max: 10, key: identifier });

// 5 reset emails per account per hour
export const forgotPasswordLimiter = rateLimit({ name: 'forgot', windowMs: 60 * 60 * 1000, max: 5, key: identifier });

// 10 attempts per reset token per 15 minutes
export const resetTokenLimiter = rateLimit({ name: 'reset', windowMs: 15 * 60 * 1000, max: 10, key: (req) => req.params.token });
