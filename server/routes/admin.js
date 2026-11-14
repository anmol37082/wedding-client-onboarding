const router = require('express').Router();
const mongoose = require('mongoose');
const Admin = require('../../models/Admin');
const User = require('../../models/User');
const ClientProfile = require('../../models/ClientProfile');
const StaffProfile = require('../../models/StaffProfile');
const ClientRequest = require('../../models/ClientRequest');
const StaffApplication = require('../../models/StaffApplication');
const JobPosition = require('../../models/JobPosition');
const Document = require('../../models/Document');
const Vacancy = require('../../models/Vacancy');
const VacancyApplication = require('../../models/VacancyApplication');
const { issue, clear, requireAdmin } = require('../../middleware/auth');
const { ok, asyncHandler, assertId, AppError } = require('../../lib/http');
const { Validator, clean, escapeRegex, normalizeMobile, startOfToday } = require('../../lib/validate');
const { hashPassword, verifyPassword } = require('../../lib/password');
const { rateLimit } = require('../../lib/rateLimit');
const { documentView } = require('../../services/documents');
const { signedUrl, signedAssetUrl } = require('../../lib/cloudinary');
const { closeExpiredVacancies, notifyApplicants } = require('../../services/vacancies');
const { CLIENT_STATUSES, STAFF_STATUSES, EVENT_TYPES } = require('../../config/options');
const { readWeddingPlanning, hasCompletePaymentPercentages } = require('../../services/weddingPlanning');
const legal = require('../../config/legal');

// ---- Auth (the only public admin routes) ----
router.post('/auth/login', rateLimit({
  windowMs: 15 * 60e3,
  // Keep the production limit strict; local admin testing can otherwise lock out the developer.
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: 'Too many login attempts. Try again in 15 minutes.',
}), asyncHandler(async (req, res) => {
  const username = clean(req.body.username, 60).toLowerCase();
  const admin = username ? await Admin.findOne({ username }) : null;
  // Same work and same message whether or not the username exists.
  const valid = await verifyPassword(String(req.body.password || ''), admin?.passwordHash || 'x:y');
  if (!admin || !valid) throw new AppError(401, 'BAD_CREDENTIALS', 'Incorrect username or password.');
  issue(res, admin._id, { admin: true, version: admin.sessionVersion });
  ok(res, { username: admin.username });
}));
router.post('/auth/logout', (req, res) => { clear(res, true); ok(res, {}); });

router.use(requireAdmin);

router.get('/auth/me', (req, res) => ok(res, { username: req.admin.username }));
router.patch('/auth/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(await verifyPassword(String(currentPassword || ''), req.admin.passwordHash))) throw new AppError(401, 'BAD_CREDENTIALS', 'Current password is incorrect.');
  if (typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 128) throw new AppError(422, 'VALIDATION', 'New password must be between 10 and 128 characters.', { newPassword: 'Use 10 to 128 characters.' });
  req.admin.passwordHash = await hashPassword(newPassword); req.admin.sessionVersion += 1; await req.admin.save();
  issue(res, req.admin._id, { admin: true, version: req.admin.sessionVersion });
  ok(res, {});
}));
router.get('/settings', (req, res) => ok(res, { termsVersion: legal.termsVersion }));

// ---- Helpers ----
function paging(req) {
  const page = Math.min(100_000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
  return { page, limit, skip: (page - 1) * limit };
}
const pageOf = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
const day = (s, end) => { const d = new Date(s); if (Number.isNaN(d.getTime())) return null; if (end) d.setHours(23, 59, 59, 999); return d; };

function listFilter(req, kind) {
  const { q, city, position, status, from, to, regFrom, regTo } = req.query;
  const f = { state: 'submitted' };
  const s = clean(q, 60);
  if (s) { const rx = new RegExp(escapeRegex(s), 'i'); f.$or = [{ fullName: rx }, { mobile: rx }]; }
  if (clean(city, 60)) f.city = new RegExp(`^${escapeRegex(clean(city, 60))}`, 'i');
  if ((kind === 'staff' ? STAFF_STATUSES : CLIENT_STATUSES).includes(status)) f.status = status;
  if (/^[a-f\d]{24}$/i.test(position || '')) f[kind === 'staff' ? 'position' : 'staff.position'] = position;
  const range = (a, b) => { const r = {}; if (a && day(a)) r.$gte = day(a); if (b && day(b, true)) r.$lte = day(b, true); return Object.keys(r).length ? mongoose.trusted(r) : null; };
  if (kind === 'client' && range(from, to)) f.weddingDate = range(from, to);
  if (range(regFrom, regTo)) f.createdAt = range(regFrom, regTo);
  return f;
}

// ---- Dashboard ----
router.get('/stats', asyncHandler(async (req, res) => {
  const [clients, staff, pending, approved, active] = await Promise.all([
    ClientProfile.countDocuments(), StaffProfile.countDocuments(),
    StaffApplication.countDocuments({ state: 'submitted', status: 'Pending' }),
    StaffApplication.countDocuments({ state: 'submitted', status: 'Approved' }),
    ClientRequest.countDocuments({ state: 'submitted', status: mongoose.trusted({ $in: ['New', 'In Review', 'Confirmed'] }) }),
  ]);
  ok(res, { totalClients: clients, totalStaff: staff, pendingApplications: pending, approvedStaff: approved, activeClientRequests: active });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const p = paging(req); const s = clean(req.query.q, 20);
  const f = s ? { mobileNumber: new RegExp(escapeRegex(s)) } : {};
  const [users, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit), User.countDocuments(f)]);
  ok(res, pageOf(users.map((u) => ({ id: u._id, mobile: u.mobileNumber, hasClient: !!u.clientProfile, hasStaff: !!u.staffProfile, createdAt: u.createdAt })), total, p));
}));

// ---- Staff ----
router.get('/staff', asyncHandler(async (req, res) => {
  const p = paging(req); const f = listFilter(req, 'staff');
  const [rows, total] = await Promise.all([StaffApplication.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit), StaffApplication.countDocuments(f)]);
  const users = await User.find({ _id: mongoose.trusted({ $in: rows.map((a) => a.user) }) }).select('staffRole');
  const access = new Map(users.map((user) => [String(user._id), user.staffRole === 'employee']));
  ok(res, pageOf(rows.map((a) => ({ id: a._id, name: a.fullName, mobile: a.mobile, position: a.positionName, experienceYears: a.experienceYears, city: a.city, status: a.status, employeeAuthorized: a.status === 'Approved' && access.get(String(a.user)) === true, registeredAt: a.createdAt })), total, p));
}));
router.get('/staff/:id', asyncHandler(async (req, res) => {
  const result = await detail(StaffApplication, req.params.id);
  const application = await StaffApplication.findById(assertId(req.params.id)).select('user status');
  const user = application && await User.findById(application.user).select('staffRole');
  ok(res, { ...result, employeeAuthorized: application?.status === 'Approved' && user?.staffRole === 'employee' });
}));
router.patch('/staff/:id/status', asyncHandler(async (req, res) => ok(res, await setStatus(StaffApplication, STAFF_STATUSES, req, true))));
router.patch('/staff/:id/employee-access', asyncHandler(async (req, res) => {
  if (typeof req.body.enabled !== 'boolean') throw new AppError(422, 'VALIDATION', 'Choose whether employee access should be enabled.');
  const application = await StaffApplication.findOne({ _id: assertId(req.params.id), state: 'submitted' });
  if (!application) throw new AppError(404, 'NOT_FOUND', 'Staff application not found.');
  if (req.body.enabled && application.status !== 'Approved') throw new AppError(409, 'APPLICATION_NOT_APPROVED', 'Approve the staff application before authorizing employee access.');
  const user = await User.findById(application.user);
  if (!user || !user.staffProfile) throw new AppError(409, 'STAFF_PROFILE_MISSING', 'This applicant has no staff profile.');
  user.staffRole = req.body.enabled ? 'employee' : 'applicant';
  await user.save();
  ok(res, { employeeAuthorized: user.staffRole === 'employee' });
}));

// ---- Clients ----
router.get('/clients', asyncHandler(async (req, res) => {
  const p = paging(req); const f = listFilter(req, 'client');
  const [rows, total] = await Promise.all([ClientRequest.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit), ClientRequest.countDocuments(f)]);
  ok(res, pageOf(rows.map((r) => ({
    id: r._id, name: r.fullName, mobile: r.mobile, weddingDate: r.weddingDate, venue: r.venue, guests: r.guests,
    status: r.status, registeredAt: r.createdAt,
  })), total, p));
}));
router.get('/clients/:id', asyncHandler(async (req, res) => ok(res, await detail(ClientRequest, req.params.id))));
router.patch('/clients/:id/revision', asyncHandler(async (req, res) => {
  const app = await ClientRequest.findOne({ _id: assertId(req.params.id), state: 'submitted' });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Submitted client request not found.');
  if (app.weddingDoneAt) throw new AppError(409, 'BOOKING_COMPLETE', 'Completed bookings cannot be edited.');
  if (app.pendingRevision?.fields) throw new AppError(409, 'REVISION_PENDING', 'This client already has changes waiting for approval.');
  const profile = await ClientProfile.findById(app.profile);
  const user = await User.findById(app.user);
  if (!profile || !user) throw new AppError(404, 'NOT_FOUND', 'Client profile not found.');

  const body = req.body || {}; const v = new Validator();
  const mobile = normalizeMobile(body.mobile);
  if (!mobile) v.fail('mobile', 'Enter a valid 10-digit Indian mobile number.');
  const nextProfile = {
    fullName: v.text('fullName', body.fullName, { label: 'Full name', min: 2, max: 100 }),
    email: v.email('email', body.email),
    address: v.text('address', body.address, { label: 'Address', min: 5, max: 300 }),
    city: v.text('city', body.city, { label: 'City', min: 2, max: 80 }),
  };
  const weddingDate = v.date('weddingDate', body.weddingDate, 'Wedding date');
  if (weddingDate && weddingDate < startOfToday()) v.fail('weddingDate', 'Wedding date cannot be in the past.');
  if (!EVENT_TYPES.includes(body.eventType)) v.fail('eventType', 'Select an event type.');
  const nextRequest = {
    weddingDate, eventType: body.eventType,
    venue: v.text('venue', body.venue, { label: 'Venue', max: 150 }),
    eventLocation: v.text('eventLocation', body.eventLocation, { label: 'Event location', max: 200 }),
    guests: v.int('guests', body.guests, { label: 'Number of guests', min: 1, max: 10000 }),
    additionalRequirements: clean(body.additionalRequirements, 1000),
  };
  let nextPlanning;
  if (body.planning !== undefined) {
    nextPlanning = readWeddingPlanning(body.planning, { draft: true, validator: v, summary: nextRequest });
    const terms = nextPlanning.commercial;
    if (!terms.planningFee) v.fail('planning.commercial.planningFee', 'Enter the agreed planner fee before sending a proposal.');
    if (!terms.taxTreatment) v.fail('planning.commercial.taxTreatment', 'Specify whether taxes are included or excluded.');
    if (!terms.cancellation) v.fail('planning.commercial.cancellation', 'Complete the cancellation schedule before sending a proposal.');
    if (!terms.postponement) v.fail('planning.commercial.postponement', 'Complete the postponement terms before sending a proposal.');
    if (!hasCompletePaymentPercentages(terms.payments)) {
      v.fail('planning.commercial.payments', 'Complete payment milestones with percentages totaling 100%.');
    }
    nextPlanning.acceptedProposalAt = null;
  }
  v.done();

  const before = { ...profile.toObject(), mobile: user.mobileNumber, ...app.toObject() };
  const proposed = { profile: nextProfile, mobile, request: nextRequest, ...(nextPlanning ? { planning: nextPlanning } : {}) };
  const fields = [
    ['fullName', 'Full name', before.fullName, nextProfile.fullName], ['mobile', 'Mobile number', before.mobile, mobile],
    ['email', 'Email', before.email, nextProfile.email], ['address', 'Address', before.address, nextProfile.address], ['city', 'City', before.city, nextProfile.city],
    ['eventType', 'Event type', before.eventType, nextRequest.eventType], ['weddingDate', 'Wedding date', before.weddingDate, weddingDate],
    ['venue', 'Venue', before.venue, nextRequest.venue], ['eventLocation', 'Event location', before.eventLocation, nextRequest.eventLocation],
    ['guests', 'Number of guests', before.guests, nextRequest.guests], ['additionalRequirements', 'Additional requirements', before.additionalRequirements, nextRequest.additionalRequirements],
  ];
  const changes = fields.filter(([, , oldValue, newValue]) => String(oldValue ?? '') !== String(newValue ?? ''))
    .map(([key, label, oldValue, newValue]) => ({ key, label, before: oldValue instanceof Date ? oldValue.toISOString() : oldValue ?? '', after: newValue instanceof Date ? newValue.toISOString() : newValue ?? '' }));
  if (nextPlanning && JSON.stringify(app.planning || {}) !== JSON.stringify(nextPlanning)) {
    changes.push({ key: 'planning', label: 'Wedding scope and commercial proposal', before: 'Current wedding brief', after: 'Updated proposal; review the terms below.' });
  }
  if (!changes.length) throw new AppError(422, 'NO_CHANGES', 'Change at least one field before sending this update.');

  app.pendingRevision = { fields: proposed, changes, proposedAt: new Date(), proposedBy: req.admin._id };
  await app.save();
  ok(res, { changes, proposedAt: app.pendingRevision.proposedAt });
}));
router.patch('/client-requests/:id/status', asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  if (await ClientRequest.exists({ _id: id, pendingRevision: mongoose.trusted({ $ne: null }) })) throw new AppError(409, 'REVISION_PENDING', 'Wait for the client to review the proposed changes before updating booking status.');
  ok(res, await setStatus(ClientRequest, CLIENT_STATUSES, req, false));
}));

async function detail(Model, id) {
  const app = await Model.findOne({ _id: assertId(id), state: 'submitted' });
  const doc = app && await Document.findById(app.currentDocument);
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  return { id: app._id, status: app.status, submittedAt: app.submittedAt, pendingRevision: app.pendingRevision || null, document: documentView(doc) };
}
// Only the review status changes; signed documents are never touched.
async function setStatus(Model, allowed, req, stamp) {
  if (!allowed.includes(req.body.status)) throw new AppError(422, 'VALIDATION', 'Invalid status.');
  if (Model === ClientRequest && req.body.status === 'Confirmed') {
    const request = await ClientRequest.findOne({ _id: assertId(req.params.id), state: 'submitted' }).select('planning pendingRevision');
    if (!request) throw new AppError(404, 'NOT_FOUND', 'Client request not found.');
    if (request.pendingRevision?.fields) throw new AppError(409, 'REVISION_PENDING', 'The client must review and sign the proposed terms before confirmation.');
    const planning = request.planning || {};
    if (planning.scope?.length && (!planning.acceptedProposalAt
      || !planning.commercial?.planningFee
      || !planning.commercial?.taxTreatment
      || !planning.commercial?.cancellation
      || !planning.commercial?.postponement
      || !hasCompletePaymentPercentages(planning.commercial.payments))) {
      throw new AppError(409, 'PROPOSAL_NOT_ACCEPTED', 'Complete the commercial terms, send the proposal and obtain the client’s signed acceptance before confirming this booking.');
    }
  }
  const update = { status: req.body.status, ...(stamp ? { reviewedAt: new Date() } : { statusUpdatedAt: new Date() }) };
  const app = await Model.findOneAndUpdate({ _id: assertId(req.params.id), state: 'submitted' }, update, { returnDocument: 'after' });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  // Approval and employee authorization are separate; any non-approved status revokes access.
  if (Model === StaffApplication && app.status !== 'Approved') {
    await User.updateOne({ _id: app.user }, { $set: { staffRole: 'applicant' } });
  }
  return { id: app._id, status: app.status };
}

// ---- Applications needing attention (pending staff + new/in-review clients) ----
router.get('/applications', asyncHandler(async (req, res) => {
  const [staff, clients] = await Promise.all([
    StaffApplication.find({ state: 'submitted', status: 'Pending' }).sort({ submittedAt: -1 }).limit(25),
    ClientRequest.find({ state: 'submitted', status: mongoose.trusted({ $in: ['New', 'In Review'] }) }).sort({ submittedAt: -1 }).limit(25),
  ]);
  const items = [
    ...staff.map((a) => ({ id: a._id, type: 'staff', name: a.fullName, mobile: a.mobile, summary: a.positionName, status: a.status, submittedAt: a.submittedAt })),
    ...clients.map((r) => ({ id: r._id, type: 'client', name: r.fullName, mobile: r.mobile, summary: `${r.eventType} · ${r.venue}`, status: r.status, submittedAt: r.submittedAt })),
  ].sort((a, b) => b.submittedAt - a.submittedAt);
  ok(res, { items });
}));

// ---- Vacancies and hiring pipeline ----
function readVacancy(body, { allowExpired = false } = {}) {
  const v = new Validator();
  const title = v.text('title', body.title, { label: 'Vacancy title', min: 2, max: 100 });
  const description = v.text('description', body.description, { label: 'Description', min: 10, max: 3000 });
  const city = v.text('city', body.city, { label: 'City', min: 2, max: 80 });
  const deadline = v.date('deadline', body.deadline, 'Application deadline');
  if (deadline && !allowExpired && deadline <= new Date()) v.fail('deadline', 'Choose a future deadline.');
  const eventDate = body.eventDate ? v.date('eventDate', body.eventDate, 'Event date') : null;
  const openings = v.int('openings', body.openings, { label: 'Staff required', min: 1, max: 500 });
  v.done();
  return {
    title, description, city, deadline, eventDate, openings,
    location: clean(body.location, 160), employmentType: clean(body.employmentType, 50) || 'Event based',
    payText: clean(body.payText, 120),
  };
}

router.get('/vacancies', asyncHandler(async (req, res) => {
  await closeExpiredVacancies();
  const vacancies = await Vacancy.find().sort({ createdAt: -1 }).lean();
  const counts = await VacancyApplication.aggregate([{ $group: { _id: '$vacancy', count: { $sum: 1 } } }]);
  const countByVacancy = new Map(counts.map((x) => [String(x._id), x.count]));
  ok(res, { vacancies: vacancies.map((v) => ({ ...v, id: v._id, applicationCount: countByVacancy.get(String(v._id)) || 0 })) });
}));

router.post('/vacancies', asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.create(readVacancy(req.body));
  ok(res, { vacancy }, 201);
}));

router.put('/vacancies/:id', asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findById(assertId(req.params.id));
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacancy not found.');
  const data = readVacancy(req.body, { allowExpired: vacancy.status !== 'open' });
  if (data.openings < vacancy.selectedCount) throw new AppError(409, 'OPENINGS_BELOW_SELECTED', 'Staff required cannot be lower than the number already selected.', { openings: `At least ${vacancy.selectedCount} staff have already been selected.` });
  const changed = ['title', 'description', 'city', 'location', 'employmentType', 'payText', 'deadline', 'eventDate', 'openings'].some((key) => String(vacancy[key] || '') !== String(data[key] || ''));
  Object.assign(vacancy, data);
  if (vacancy.status === 'open' && vacancy.deadline <= new Date()) { vacancy.status = 'closed'; vacancy.closedReason = 'deadline'; }
  if (vacancy.status === 'closed' && ['filled', 'deadline'].includes(vacancy.closedReason) && vacancy.openings > vacancy.selectedCount && vacancy.deadline > new Date()) { vacancy.status = 'open'; vacancy.closedReason = null; }
  await vacancy.save();
  if (changed) await notifyApplicants(vacancy._id, { type: 'vacancy-updated', title: 'Vacancy updated', message: `Details for ${vacancy.title} have been updated by the admin team.` });
  ok(res, { vacancy });
}));

router.patch('/vacancies/:id/status', asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findById(assertId(req.params.id));
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacancy not found.');
  const status = req.body.status;
  if (!['open', 'paused', 'closed'].includes(status)) throw new AppError(422, 'VALIDATION', 'Choose open, paused or closed.');
  if (status === 'open' && vacancy.deadline <= new Date()) throw new AppError(409, 'DEADLINE_PASSED', 'A vacancy cannot be opened after its deadline.');
  if (status === 'open' && vacancy.selectedCount >= vacancy.openings) throw new AppError(409, 'VACANCY_FILLED', 'All staff positions are already filled.');
  vacancy.status = status;
  vacancy.closedReason = status === 'closed' ? 'manual' : null;
  await vacancy.save();
  const text = status === 'paused' ? 'Applications are temporarily paused.' : status === 'closed' ? 'This vacancy is now closed.' : 'Applications are open again.';
  await notifyApplicants(vacancy._id, { type: `vacancy-${status}`, title: 'Vacancy status updated', message: `${vacancy.title}: ${text}` });
  ok(res, { vacancy });
}));

router.get('/vacancies/:id/applications', asyncHandler(async (req, res) => {
  await closeExpiredVacancies();
  const vacancy = await Vacancy.findById(assertId(req.params.id));
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacancy not found.');
  const rows = await VacancyApplication.find({ vacancy: vacancy._id }).sort({ appliedAt: 1 }).populate('profile', 'fullName email city skills experienceYears education').lean();
  ok(res, { vacancy, applications: rows.map((a) => ({
    id: a._id, name: a.profile?.fullName, email: a.profile?.email, city: a.profile?.city, skills: a.profile?.skills || [],
    experienceYears: a.profile?.experienceYears || 0, education: a.profile?.education, stage: a.stage, appliedAt: a.appliedAt,
    interviewAt: a.interviewAt, interviewLocation: a.interviewLocation, joiningDate: a.joiningDate,
    cv: { fileName: a.cv.fileName, mimeType: a.cv.mimeType, url: signedAssetUrl(a.cv.publicId, a.cv.resourceType) },
    photoUrl: signedUrl(a.photo.publicId, 500), signatureUrl: signedUrl(a.signature.publicId, 500),
  })) });
}));

router.patch('/vacancy-applications/:id/stage', asyncHandler(async (req, res) => {
  await closeExpiredVacancies();
  const application = await VacancyApplication.findById(assertId(req.params.id));
  if (!application) throw new AppError(404, 'NOT_FOUND', 'Vacancy application not found.');
  const vacancy = await Vacancy.findById(application.vacancy);
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacancy not found.');
  const stage = req.body.stage;
  const allowed = {
    Applied: ['Under Review', 'Rejected'], 'Under Review': ['Shortlisted', 'Rejected'],
    Shortlisted: ['Interview Scheduled', 'Rejected'], 'Interview Scheduled': ['Selected', 'Rejected'],
    Selected: [], Rejected: [],
  };
  if (!Object.hasOwn(allowed, stage)) throw new AppError(422, 'VALIDATION', 'Choose a valid hiring stage.');
  const unchanged = stage === application.stage;
  if (!unchanged && !allowed[application.stage]?.includes(stage)) throw new AppError(409, 'INVALID_STAGE_TRANSITION', `Cannot move an application from ${application.stage} to ${stage}.`);
  let interviewAt = application.interviewAt; let interviewLocation = application.interviewLocation; let joiningDate = application.joiningDate;
  if (stage === 'Interview Scheduled') {
    interviewAt = new Date(req.body.interviewAt);
    if (Number.isNaN(interviewAt.getTime())) throw new AppError(422, 'VALIDATION', 'Set an interview date and time.', { interviewAt: 'Interview date and time are required.' });
    interviewLocation = clean(req.body.interviewLocation, 240);
    if (!interviewLocation) throw new AppError(422, 'VALIDATION', 'Set an interview location or meeting link.', { interviewLocation: 'Interview location or meeting link is required.' });
  }
  if (stage === 'Selected' || application.stage === 'Selected') {
    joiningDate = req.body.joiningDate ? new Date(req.body.joiningDate) : joiningDate;
    if (!joiningDate || Number.isNaN(joiningDate.getTime())) throw new AppError(422, 'VALIDATION', 'Set the joining date for the selected candidate.', { joiningDate: 'Joining date is required.' });
  }

  let reserved = false;
  if (stage === 'Selected' && application.stage !== 'Selected') {
    const slot = await Vacancy.findOneAndUpdate({ _id: vacancy._id, status: 'open', deadline: mongoose.trusted({ $gt: new Date() }), selectedCount: mongoose.trusted({ $lt: vacancy.openings }) }, { $inc: { selectedCount: 1 } }, { returnDocument: 'after' });
    if (!slot) throw new AppError(409, 'NO_OPENINGS', 'This vacancy is closed or all positions have been filled.');
    reserved = true;
    if (slot.selectedCount >= slot.openings) { slot.status = 'closed'; slot.closedReason = 'filled'; await slot.save(); }
  }
  application.stage = stage; application.interviewAt = interviewAt; application.interviewLocation = interviewLocation; application.joiningDate = joiningDate;
  const text = stage === 'Interview Scheduled' ? `Your interview is scheduled for ${interviewAt.toLocaleString('en-IN')} at ${interviewLocation}.`
    : stage === 'Selected' ? `Congratulations. You have been selected for ${vacancy.title}. Joining date: ${joiningDate.toLocaleDateString('en-IN')}.`
      : stage === 'Rejected' ? `The hiring team has completed its review for ${vacancy.title}. This application will not move forward.`
        : `Your application for ${vacancy.title} is now ${stage.toLowerCase()}.`;
  application.notifications.push({ type: `stage-${stage.toLowerCase().replaceAll(' ', '-')}`, title: `Application ${stage}`, message: text });
  application.notifications = application.notifications.slice(-50);
  try { await application.save(); }
  catch (error) {
    if (reserved) await Vacancy.updateOne({ _id: vacancy._id }, { $inc: { selectedCount: -1 }, $set: { status: 'open', closedReason: null } });
    throw error;
  }
  if (reserved) {
    const latest = await Vacancy.findById(vacancy._id);
    if (latest?.closedReason === 'filled') await notifyApplicants(vacancy._id, { type: 'vacancy-filled', title: 'Vacancy filled', message: `${vacancy.title} has closed because all available positions have been filled.` });
  }
  ok(res, { id: application._id, stage: application.stage, selectedCount: (await Vacancy.findById(vacancy._id)).selectedCount });
}));

// ---- Documents (read-only) ----
router.get('/documents', asyncHandler(async (req, res) => {
  const p = paging(req);
  const f = ['client', 'staff'].includes(req.query.type) ? { profileType: req.query.type } : {};
  const [docs, total] = await Promise.all([Document.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).select('profileType version createdAt snapshot.person.name snapshot.person.mobile'), Document.countDocuments(f)]);
  ok(res, pageOf(docs.map((d) => ({ id: d._id, type: d.profileType, version: d.version, name: d.snapshot?.person?.name, mobile: d.snapshot?.person?.mobile, createdAt: d.createdAt })), total, p));
}));

// ---- Job positions ----
function readPosition(body) {
  const v = new Validator();
  const name = v.text('name', body.name, { label: 'Name', max: 60 });
  v.done();
  return { name, nameKey: name.toLowerCase() };
}
router.get('/job-positions', asyncHandler(async (req, res) => ok(res, { positions: await JobPosition.find().sort({ order: 1, name: 1 }) })));
router.post('/job-positions', asyncHandler(async (req, res) => {
  const data = readPosition(req.body);
  if (await JobPosition.exists({ nameKey: data.nameKey })) throw new AppError(409, 'DUPLICATE', 'A position with this name already exists.', { name: 'Already exists.' });
  const order = await JobPosition.countDocuments();
  ok(res, { position: await JobPosition.create({ ...data, order }) }, 201);
}));
router.put('/job-positions/:id', asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.name !== undefined) {
    Object.assign(update, readPosition(req.body));
    if (await JobPosition.exists({ nameKey: update.nameKey, _id: mongoose.trusted({ $ne: assertId(req.params.id) }) })) throw new AppError(409, 'DUPLICATE', 'A position with this name already exists.', { name: 'Already exists.' });
  }
  if (typeof req.body.active === 'boolean') update.active = req.body.active;
  const position = await JobPosition.findByIdAndUpdate(assertId(req.params.id), update, { returnDocument: 'after' });
  if (!position) throw new AppError(404, 'NOT_FOUND', 'Position not found.');
  ok(res, { position });
}));
// Deleting is only allowed when nothing refers to the position; otherwise disable it.
router.delete('/job-positions/:id', asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  const [a, b] = await Promise.all([StaffApplication.exists({ position: id }), ClientRequest.exists({ 'staff.position': id })]);
  if (a || b) throw new AppError(409, 'IN_USE', 'This position is used by existing applications. Disable it instead.');
  await JobPosition.findByIdAndDelete(id);
  ok(res, {});
}));

module.exports = router;
