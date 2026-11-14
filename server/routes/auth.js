const router = require('express').Router();
const User = require('../../models/User');
const ClientRequest = require('../../models/ClientRequest');
const StaffApplication = require('../../models/StaffApplication');
const { issue, clear, requireAuth } = require('../../middleware/auth');
const { ok, asyncHandler, AppError } = require('../../lib/http');
const { normalizeEmail } = require('../../lib/validate');
const { rateLimit } = require('../../lib/rateLimit');
const { sendOtp, verifyOtp } = require('../../services/otp');

const limitSend = rateLimit({ windowMs: 3600e3, max: 30 });
const limitVerify = rateLimit({ windowMs: 15 * 60e3, max: 30 });

router.post('/send-otp', limitSend, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) throw new AppError(422, 'VALIDATION', 'Enter a valid email address.', { email: 'Enter a valid email address.' });
  ok(res, await sendOtp(email));
}));

router.post('/verify-otp', limitVerify, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '');
  if (!email) throw new AppError(422, 'VALIDATION', 'Enter a valid email address.');
  if (!/^\d{6}$/.test(otp)) throw new AppError(422, 'VALIDATION', 'Enter the 6-digit OTP.', { otp: 'Enter the 6-digit OTP.' });
  await verifyOtp(email, otp);
  // One verified email = one account. Existing profiles stay attached to that account.
  const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  issue(res, user._id);
  const context = ['client', 'staff'].includes(req.body.context) ? req.body.context : '';
  ok(res, await summary(user, context));
}));

async function summary(user, context = '') {
  await user.populate([{ path: 'clientProfile', select: 'fullName' }, { path: 'staffProfile', select: 'fullName' }]);
  const includeClient = context !== 'staff';
  const includeStaff = context !== 'client';
  const [client, staff] = await Promise.all([
    includeClient && user.clientProfile ? ClientRequest.findOne({ user: user._id }).select('state status') : null,
    includeStaff && user.staffProfile ? StaffApplication.findOne({ user: user._id }).select('state status') : null,
  ]);
  return {
    id: user._id, email: user.email, mobile: user.mobileNumber || '',
    ...(includeClient ? { client: user.clientProfile ? { name: user.clientProfile.fullName, submitted: client?.state === 'submitted', status: client?.status } : null } : {}),
    ...(includeStaff ? { staff: user.staffProfile ? {
      name: user.staffProfile.fullName, submitted: staff?.state === 'submitted', status: staff?.status,
      employeeAuthorized: user.staffRole === 'employee' && staff?.state === 'submitted' && staff?.status === 'Approved',
    } : null } : {}),
  };
}
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const context = ['client', 'staff'].includes(req.query.context) ? req.query.context : '';
  ok(res, await summary(req.user, context));
}));
router.post('/logout', (req, res) => { clear(res); ok(res, {}); });

module.exports = router;
