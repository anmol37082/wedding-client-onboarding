const { AppError } = require('./http');

const clean = (v, max = 500) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}
function normalizeEmail(input) {
  const email = clean(input, 120).toLowerCase();
  return EMAIL.test(email) ? email : null;
}
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const ageOn = (dob, now = new Date()) => {
  let a = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
  return a;
};

class Validator {
  constructor() { this.fields = {}; }
  fail(f, m) { if (!this.fields[f]) this.fields[f] = m; }
  text(f, v, { label = f, min = 1, max = 200, required = true } = {}) {
    const s = clean(v, max);
    if (!s) { if (required) this.fail(f, `${label} is required.`); return ''; }
    if (s.length < min) this.fail(f, `${label} must be at least ${min} characters.`);
    return s;
  }
  email(f, v, { required = true } = {}) {
    const s = clean(v, 120).toLowerCase();
    if (!s) { if (required) this.fail(f, 'Email is required.'); return ''; }
    if (!EMAIL.test(s)) this.fail(f, 'Enter a valid email address.');
    return s;
  }
  int(f, v, { label = f, min = 0, max = 100000 } = {}) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) { this.fail(f, `${label} must be a whole number between ${min} and ${max}.`); return 0; }
    return n;
  }
  date(f, v, label) {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) { this.fail(f, `${label} is required.`); return null; }
    return d;
  }
  done() { if (Object.keys(this.fields).length) throw new AppError(422, 'VALIDATION', 'Please correct the highlighted fields.', this.fields); }
}
module.exports = { clean, normalizeMobile, normalizeEmail, escapeRegex, startOfToday, ageOn, Validator };
