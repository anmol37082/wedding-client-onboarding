const crypto = require('crypto');
const mongoose = require('mongoose');
const Otp = require('../models/Otp');
const { AppError } = require('../lib/http');
const { sendEmailOtp } = require('./email');

const TTL_SEC = 300, RESEND_SEC = 30, MAX_ATTEMPTS = 5, MAX_SENDS_PER_HOUR = 6;
const hashCode = (email, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${code}`).digest('hex');

async function sendOtp(email) {
  const now = Date.now();
  const existing = await Otp.findOne({ email });
  let windowStart = new Date(now), sendCount = 1;
  if (existing) {
    const wait = RESEND_SEC - Math.floor((now - existing.lastSentAt) / 1000);
    if (wait > 0) throw new AppError(429, 'OTP_COOLDOWN', `Please wait ${wait} seconds before requesting another OTP.`);
    if (now - existing.windowStart < 3600 * 1000) {
      if (existing.sendCount >= MAX_SENDS_PER_HOUR) throw new AppError(429, 'OTP_LIMIT', 'Too many OTP requests. Please try again in an hour.');
      windowStart = existing.windowStart; sendCount = existing.sendCount + 1;
    }
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.findOneAndUpdate({ email }, {
    codeHash: hashCode(email, code), expiresAt: new Date(now + TTL_SEC * 1000), attempts: 0,
    lastSentAt: new Date(now), windowStart, sendCount,
  }, { upsert: true });
  try { await sendEmailOtp(email, code); }
  catch (e) { console.error('OTP delivery failed:', e.code || 'SMTP_ERROR'); throw new AppError(502, 'EMAIL_FAILED', 'We could not send the OTP email. Please try again.'); }
  const dev = (process.env.OTP_PROVIDER || 'console') === 'console' && process.env.NODE_ENV !== 'production';
  return { email, expiresInSec: TTL_SEC, resendInSec: RESEND_SEC, ...(dev ? { devOtp: code } : {}) };
}

async function verifyOtp(email, code) {
  const doc = await Otp.findOne({ email });
  if (!doc || doc.expiresAt < new Date()) throw new AppError(400, 'OTP_EXPIRED', 'This OTP has expired. Please request a new one.');
  if (doc.attempts >= MAX_ATTEMPTS) throw new AppError(429, 'OTP_ATTEMPTS', 'Too many incorrect attempts. Please request a new OTP.');
  const given = Buffer.from(hashCode(email, String(code || '')));
  const real = Buffer.from(doc.codeHash);
  const valid = given.length === real.length && crypto.timingSafeEqual(given, real);
  const currentOtp = { email, codeHash: doc.codeHash, expiresAt: mongoose.trusted({ $gt: new Date() }), attempts: mongoose.trusted({ $lt: MAX_ATTEMPTS }) };
  if (!valid) {
    const updated = await Otp.findOneAndUpdate(currentOtp, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
    if (!updated) throw new AppError(400, 'OTP_EXPIRED', 'This OTP has expired or was replaced. Please request a new one.');
    const left = MAX_ATTEMPTS - updated.attempts;
    throw new AppError(400, 'OTP_INVALID', left > 0 ? `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new OTP.');
  }
  const consumed = await Otp.deleteOne(currentOtp);
  if (!consumed.deletedCount) throw new AppError(400, 'OTP_EXPIRED', 'This OTP has expired or was already used. Please request a new one.');
}
module.exports = { sendOtp, verifyOtp };
