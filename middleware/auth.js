const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const StaffApplication = require('../models/StaffApplication');
const { hasEmployeeAccess, canEditStaffApplication } = require('../lib/access');
const { AppError, asyncHandler } = require('../lib/http');

const USER_COOKIE = 'token', ADMIN_COOKIE = 'admin_token';
const WEEK = 7 * 24 * 3600 * 1000;
const secret = (admin) => (admin ? `${process.env.JWT_SECRET}:admin` : process.env.JWT_SECRET);
const cookieOpts = (maxAge) => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });

function issue(res, id, { admin = false, version = 0 } = {}) {
  const ttl = admin ? 8 * 3600 * 1000 : WEEK;
  const token = jwt.sign({ sub: String(id), role: admin ? 'admin' : 'user', ...(admin ? { ver: version } : {}) }, secret(admin), { expiresIn: Math.floor(ttl / 1000) });
  res.cookie(admin ? ADMIN_COOKIE : USER_COOKIE, token, cookieOpts(ttl));
}
const clear = (res, admin = false) => res.clearCookie(admin ? ADMIN_COOKIE : USER_COOKIE, { ...cookieOpts(0), maxAge: undefined });

function read(req, admin) {
  const token = req.cookies?.[admin ? ADMIN_COOKIE : USER_COOKIE];
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret(admin));
    return p.role === (admin ? 'admin' : 'user') ? p : null;
  } catch { return null; }
}
async function loadUser(req) { const token = read(req, false); return token ? User.findById(token.sub) : null; }
async function loadAdmin(req) {
  const token = read(req, true);
  if (!token) return null;
  const admin = await Admin.findById(token.sub);
  return admin && (token.ver ?? 0) === admin.sessionVersion ? admin : null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await loadUser(req);
  if (!user || !user.emailVerified) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
  req.user = user; next();
});
const requireClient = [requireAuth, (req, res, next) =>
  (req.user.clientProfile ? next() : next(new AppError(403, 'NO_CLIENT_PROFILE', 'Create a client profile first.')))];
const requireStaff = [requireAuth, (req, res, next) =>
  (req.user.staffProfile ? next() : next(new AppError(403, 'NO_STAFF_PROFILE', 'Create a staff profile first.')))];
const requireApplicant = [...requireStaff, (req, res, next) =>
  (canEditStaffApplication(req.user) ? next() : next(new AppError(403, 'EMPLOYEE_ACCESS', 'Employee accounts cannot edit job applications.')))];
const requireEmployee = [...requireStaff, asyncHandler(async (req, res, next) => {
  const application = await StaffApplication.findOne({ user: req.user._id, state: 'submitted' }).select('status reviewedAt');
  if (!hasEmployeeAccess(req.user, application && { ...application.toObject(), state: 'submitted' })) {
    throw new AppError(403, 'EMPLOYEE_ACCESS_REQUIRED', 'An administrator must approve your application and authorize employee access.');
  }
  req.staffApplication = application;
  next();
})];
const requireAdmin = asyncHandler(async (req, res, next) => {
  const admin = await loadAdmin(req);
  if (!admin) throw new AppError(401, 'ADMIN_UNAUTHENTICATED', 'Admin login required.');
  req.admin = admin; next();
});
// For shared resources (documents): accepts a normal user, an admin, or both.
const requireUserOrAdmin = asyncHandler(async (req, res, next) => {
  req.user = await loadUser(req); req.admin = await loadAdmin(req);
  if (!req.user && !req.admin) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
  next();
});

module.exports = { issue, clear, requireAuth, requireClient, requireStaff, requireApplicant, requireEmployee, requireAdmin, requireUserOrAdmin };
