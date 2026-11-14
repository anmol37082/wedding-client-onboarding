const router = require('express').Router();
const mongoose = require('mongoose');
const StaffProfile = require('../../models/StaffProfile');
const User = require('../../models/User');
const StaffApplication = require('../../models/StaffApplication');
const JobPosition = require('../../models/JobPosition');
const Vacancy = require('../../models/Vacancy');
const VacancyApplication = require('../../models/VacancyApplication');
const { requireAuth, requireStaff, requireApplicant, requireEmployee } = require('../../middleware/auth');
const { ok, asyncHandler, AppError } = require('../../lib/http');
const { Validator, clean, ageOn, normalizeMobile } = require('../../lib/validate');
const { EDUCATION_LEVELS, MIN_STAFF_AGE } = require('../../config/options');
const { readConsent, present } = require('../../services/submission');
const { ensureDocument } = require('../../services/documents');
const { mediaRef } = require('../../services/media');
const { folderFor } = require('../../lib/cloudinary');
const { closeExpiredVacancies } = require('../../services/vacancies');

const readSkills = (raw) => [...new Set((Array.isArray(raw) ? raw.slice(0, 15) : []).map((s) => clean(s, 40)).filter(Boolean))];

function readProfile(body, { draft }) {
  const v = new Validator();
  const dobRaw = new Date(body.dob);
  const dobOk = body.dob && !Number.isNaN(dobRaw.getTime());
  const email = clean(body.email, 120).toLowerCase();
  let data;
  if (draft) {
    const y = parseInt(body.experienceYears, 10);
    data = {
      fullName: clean(body.fullName, 100), dob: dobOk ? dobRaw : undefined,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : '',
      address: clean(body.address, 300), city: clean(body.city, 80),
      education: EDUCATION_LEVELS.includes(body.education) ? body.education : '', skills: readSkills(body.skills),
      experienceYears: Number.isInteger(y) && y >= 0 && y <= 60 ? y : 0, experienceDetails: clean(body.experienceDetails, 1000),
    };
  } else {
    if (!dobOk) v.fail('dob', 'Date of birth is required.');
    else if (dobRaw > new Date()) v.fail('dob', 'Date of birth cannot be in the future.');
    else if (ageOn(dobRaw) < MIN_STAFF_AGE) v.fail('dob', `You must be at least ${MIN_STAFF_AGE} years old.`);
    else if (ageOn(dobRaw) > 80) v.fail('dob', 'Enter a valid date of birth.');
    if (!EDUCATION_LEVELS.includes(body.education)) v.fail('education', 'Select your education.');
    const skills = readSkills(body.skills);
    if (!skills.length) v.fail('skills', 'Add at least one skill.');
    data = {
      fullName: v.text('fullName', body.fullName, { label: 'Full name', min: 2, max: 100 }),
      dob: dobOk ? dobRaw : undefined, email: v.email('email', body.email, { required: false }),
      address: v.text('address', body.address, { label: 'Address', min: 5, max: 300 }),
      city: v.text('city', body.city, { label: 'City', min: 2, max: 80 }),
      education: body.education, skills,
      experienceYears: v.int('experienceYears', body.experienceYears, { label: 'Experience', min: 0, max: 60 }),
      experienceDetails: v.text('experienceDetails', body.experienceDetails, { label: 'Experience details', required: false, max: 1000 }),
    };
  }
  v.done();
  return data;
}

async function saveProfile(req, res, creating) {
  if (creating && req.user.staffProfile) throw new AppError(409, 'PROFILE_EXISTS', 'Staff profile already exists.');
  const draft = req.body.draft === true;
  const data = readProfile(req.body, { draft });
  const mobile = normalizeMobile(req.body.mobile);
  if (!mobile && !draft) throw new AppError(422, 'VALIDATION', 'Enter a valid 10-digit mobile number.', { mobile: 'Enter a valid 10-digit mobile number.' });
  if (mobile) {
    const other = await User.findOne({ mobileNumber: mobile, _id: mongoose.trusted({ $ne: req.user._id }) });
    if (other) throw new AppError(409, 'MOBILE_IN_USE', 'This mobile number is already linked to another account.', { mobile: 'This mobile number is already linked to another account.' });
    req.user.mobileNumber = mobile; await req.user.save();
  }
  const profile = await StaffProfile.findOneAndUpdate({ user: req.user._id }, data, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  if (!req.user.staffProfile) { req.user.staffProfile = profile._id; await req.user.save(); }
  ok(res, { profile }, creating ? 201 : 200);
}
router.post('/profile', requireAuth, asyncHandler((req, res) => saveProfile(req, res, true)));
router.put('/profile', ...requireApplicant, asyncHandler((req, res) => saveProfile(req, res, false)));
router.get('/profile', ...requireStaff, asyncHandler(async (req, res) => ok(res, { profile: await StaffProfile.findById(req.user.staffProfile) })));
router.get('/employee-profile', ...requireEmployee, asyncHandler(async (req, res) => ok(res, {
  profile: await StaffProfile.findById(req.user.staffProfile),
  authorized: true,
  approvedAt: req.staffApplication.reviewedAt || null,
})));

async function readPosition(id, { required }) {
  const position = /^[a-f\d]{24}$/i.test(String(id)) ? await JobPosition.findOne({ _id: id, active: true }) : null;
  if (!position && required) throw new AppError(422, 'VALIDATION', 'Please correct the highlighted fields.', { position: 'Select a job position.' });
  return position;
}

router.post('/application', ...requireApplicant, asyncHandler(async (req, res) => {
  const profile = await StaffProfile.findById(req.user.staffProfile);
  const existing = await StaffApplication.findOne({ user: req.user._id });
  if (existing?.state === 'submitted') return ok(res, { application: present(existing), persisted: false });
  const position = await readPosition(req.body.positionId, { required: false });
  const application = await StaffApplication.findOneAndUpdate({ user: req.user._id }, {
    profile: profile._id, position: position?._id, positionName: position?.name,
    fullName: profile.fullName, mobile: req.user.mobileNumber, city: profile.city, experienceYears: profile.experienceYears,
  }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  ok(res, { application: present(application), persisted: true }, 201);
}));

router.get('/application', ...requireApplicant, asyncHandler(async (req, res) => {
  const application = await StaffApplication.findOne({ user: req.user._id });
  ok(res, { application: present(application), documentId: application?.currentDocument || null });
}));

router.post('/application/submit', ...requireApplicant, asyncHandler(async (req, res) => {
  const profile = await StaffProfile.findById(req.user.staffProfile);
  readProfile(profile.toObject(), { draft: false });
  const position = await readPosition(req.body.positionId, { required: true });
  const previous = await StaffApplication.findOne({ user: req.user._id });
  const v = new Validator();
  const media = readConsent(req.body, req.user._id, v, previous?.state === 'submitted' ? previous : null);
  v.done();
  const unchanged = previous?.state === 'submitted' && media.photo?.publicId === previous.photo?.publicId;
  const application = await StaffApplication.findOneAndUpdate({ user: req.user._id }, {
    ...media, profile: profile._id, position: position._id, positionName: position.name, state: 'submitted',
    fullName: profile.fullName, mobile: req.user.mobileNumber, city: profile.city, experienceYears: profile.experienceYears,
    submittedAt: unchanged ? previous.submittedAt : new Date(),
  }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  const { doc, created, firstVersion } = await ensureDocument('staff', application, profile, req.user.mobileNumber);
  if (created && !firstVersion) { application.status = 'Pending'; application.reviewedAt = undefined; await application.save(); }
  ok(res, { documentId: doc._id, version: doc.version }, 201);
}));

// Open roles are available to every signed-in account with a staff profile.
router.get('/vacancies/open', ...requireStaff, asyncHandler(async (req, res) => {
  await closeExpiredVacancies();
  const vacancies = await Vacancy.find({ status: 'open', deadline: mongoose.trusted({ $gt: new Date() }) }).sort({ deadline: 1, createdAt: -1 }).lean();
  const applications = await VacancyApplication.find({ user: req.user._id, vacancy: mongoose.trusted({ $in: vacancies.map((v) => v._id) }) }).select('vacancy stage');
  const applied = new Map(applications.map((a) => [String(a.vacancy), a.stage]));
  ok(res, { vacancies: vacancies.map((v) => ({ ...v, id: v._id, alreadyApplied: applied.has(String(v._id)), stage: applied.get(String(v._id)) || null })) });
}));

router.get('/vacancies/mine', ...requireStaff, asyncHandler(async (req, res) => {
  const applications = await VacancyApplication.find({ user: req.user._id }).select('vacancy stage appliedAt interviewAt interviewLocation joiningDate notifications updatedAt').sort({ updatedAt: -1 }).limit(50).populate('vacancy', 'title city location deadline status eventDate employmentType payText');
  const notifications = applications.flatMap((a) => a.notifications.map((n) => ({ id: n._id, applicationId: a._id, vacancy: a.vacancy?.title || 'Staff vacancy', type: n.type, title: n.title, message: n.message, createdAt: n.createdAt, read: Boolean(n.readAt) }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);
  ok(res, { applications, notifications, unreadCount: notifications.filter((n) => !n.read).length });
}));

router.patch('/vacancies/notifications/read', ...requireStaff, asyncHandler(async (req, res) => {
  await VacancyApplication.updateMany({ user: req.user._id, 'notifications.readAt': null }, { $set: { 'notifications.$[notice].readAt': new Date() } }, { arrayFilters: [{ 'notice.readAt': null }] });
  ok(res, {});
}));

router.post('/vacancies/:id/apply', ...requireApplicant, asyncHandler(async (req, res) => {
  const vacancy = /^[a-f\d]{24}$/i.test(String(req.params.id)) ? await Vacancy.findById(req.params.id) : null;
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacancy not found.');
  await closeExpiredVacancies();
  if (vacancy.status !== 'open' || vacancy.deadline <= new Date()) throw new AppError(409, 'VACANCY_CLOSED', 'This vacancy is no longer accepting applications.');
  const existing = await VacancyApplication.findOne({ vacancy: vacancy._id, user: req.user._id });
  if (existing) throw new AppError(409, 'ALREADY_APPLIED', 'You have already applied for this vacancy.');
  const profile = await StaffProfile.findById(req.user.staffProfile);
  if (!profile) throw new AppError(409, 'PROFILE_REQUIRED', 'Complete your staff profile before applying.');

  const cvPublicId = req.body.cvPublicId;
  const cvResourceType = req.body.cvResourceType;
  const cvPattern = new RegExp(`^${folderFor(req.user._id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/cv-\\d{13}(?:-[a-f\\d]{32})?(?:\\.pdf)?$`);
  const isPdfId = typeof cvPublicId === 'string' && cvPublicId.endsWith('.pdf');
  const mediaMatchesType = req.body.mimeType === 'application/pdf' ? isPdfId && cvResourceType === 'raw'
    : ['image/png', 'image/jpeg'].includes(req.body.mimeType) && !isPdfId && cvResourceType === 'image';
  const cv = typeof cvPublicId === 'string' && cvPattern.test(cvPublicId) && mediaMatchesType ? {
    publicId: cvPublicId, resourceType: cvResourceType, fileName: clean(req.body.fileName, 120) || 'CV', mimeType: clean(req.body.mimeType, 60),
  } : null;
  if (!cv) throw new AppError(422, 'VALIDATION', 'Upload a valid CV first.', { cv: 'A valid PDF or image CV is required.' });
  const photo = mediaRef(req.body.photoPublicId, req.user._id, 'photo');
  const signature = mediaRef(req.body.signaturePublicId, req.user._id, 'signature');
  if (!photo || !signature) throw new AppError(422, 'VALIDATION', 'Upload a photo and signature before applying.', { media: 'Photo and signature are required.' });

  try {
    const application = await VacancyApplication.create({ vacancy: vacancy._id, user: req.user._id, profile: profile._id, cv, photo, signature });
    ok(res, { applicationId: application._id, stage: application.stage }, 201);
  } catch (error) {
    if (error.code === 11000) throw new AppError(409, 'ALREADY_APPLIED', 'You have already applied for this vacancy.');
    throw error;
  }
}));

module.exports = router;
