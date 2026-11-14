const crypto = require('crypto');
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));

async function hashPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10 || pw.length > 128) throw new Error('Password must be between 10 and 128 characters.');
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${(await scrypt(pw, salt)).toString('hex')}`;
}
async function verifyPassword(pw, stored) {
  if (typeof pw !== 'string' || pw.length > 128) return false;
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = await scrypt(pw, Buffer.from(salt, 'hex')); const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { hashPassword, verifyPassword };
