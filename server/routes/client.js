const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../../models/User');
const ClientProfile = require('../../models/ClientProfile');
const ClientRequest = require('../../models/ClientRequest');
const { requireAuth, requireClient } = require('../../middleware/auth');
const { ok, asyncHandler, AppError } = require('../../lib/http');
const { Validator, clean, startOfToday, normalizeMobile } = require('../../lib/validate');
const { EVENT_TYPES } = require('../../config/options');
const { readWeddingBriefConsent, present } = require('../../services/submission');
const { ensureDocument } = require('../../services/documents');
const { mediaRef } = require('../../services/media');
const { WEDDING_BRIEF_VERSION } = require('../../config/wedding');
const { readWeddingPlanning } = require('../../services/weddingPlanning');

function readProfile(body, { draft }) {
  const v = new Validator();
  const email = clean(body.email, 120).toLowerCase();
  const data = draft
    ? { fullName: clean(body.fullName, 100), email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : '', address: clean(body.address, 300), city: clean(body.city, 80) }
    : {
      fullName: v.text('fullName', body.fullName, { label: 'Full name', min: 2, max: 100 }),
      email: v.email('email', body.email),
      address: v.text('address', body.address, { label: 'Address', min: 5, max: 300 }),
      city: v.text('city', body.city, { label: 'City', min: 2, max: 80 }),
    };
  v.done();
  return data;
}

async function saveProfile(req, res, creating) {
  if (creating && req.user.clientProfile) throw new AppError(409, 'PROFILE_EXISTS', 'Client profile already exists.');
  if (!creating && await ClientRequest.exists({ user: req.user._id, state: 'submitted', pendingRevision: mongoose.trusted({ $ne: null }) })) throw new AppError(409, 'REVISION_PENDING', 'Review the admin changes before editing your profile.');
  const draft = req.body.draft === true;
  const data = readProfile(req.body, { draft });
  const mobile = normalizeMobile(req.body.mobile);
  if (!mobile && !draft) throw new AppError(422, 'VALIDATION', 'Enter a valid 10-digit mobile number.', { mobile: 'Enter a valid 10-digit mobile number.' });
  if (mobile) {
    const other = await User.findOne({ mobileNumber: mobile, _id: mongoose.trusted({ $ne: req.user._id }) });
    if (other) throw new AppError(409, 'MOBILE_IN_USE', 'This mobile number is already linked to another account.', { mobile: 'This mobile number is already linked to another account.' });
    req.user.mobileNumber = mobile; await req.user.save();
  }
  const profile = await ClientProfile.findOneAndUpdate({ user: req.user._id }, data, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  if (!req.user.clientProfile) { req.user.clientProfile = profile._id; await req.user.save(); }
  ok(res, { profile }, creating ? 201 : 200);
}
router.post('/profile', requireAuth, asyncHandler((req, res) => saveProfile(req, res, true)));
router.put('/profile', ...requireClient, asyncHandler((req, res) => saveProfile(req, res, false)));
router.get('/profile', ...requireClient, asyncHandler(async (req, res) => ok(res, { profile: await ClientProfile.findById(req.user.clientProfile) })));

async function readRequest(body, profile, mobile, { draft }) {
  const form = body.form || body;
  const v = new Validator();
  let data;
  if (draft) {
    const d = new Date(form.weddingDate); const g = parseInt(form.guests, 10);
    data = {
      weddingDate: Number.isNaN(d.getTime()) ? undefined : d,
      eventType: EVENT_TYPES.includes(form.eventType) ? form.eventType : undefined,
      venue: clean(form.venue, 150), eventLocation: clean(form.eventLocation, 200),
      guests: Number.isInteger(g) && g > 0 && g <= 10000 ? g : undefined,
      staff: [], additionalRequirements: clean(form.additionalRequirements, 1000),
    };
  } else {
    const weddingDate = v.date('weddingDate', form.weddingDate, 'Wedding date');
    if (weddingDate && weddingDate < startOfToday()) v.fail('weddingDate', 'Wedding date cannot be in the past.');
    if (!EVENT_TYPES.includes(form.eventType)) v.fail('eventType', 'Select an event type.');
    data = {
      weddingDate, eventType: form.eventType,
      venue: v.text('venue', form.venue, { label: 'Venue', max: 150 }),
      eventLocation: v.text('eventLocation', form.eventLocation, { label: 'Event location', max: 200 }),
      guests: v.int('guests', form.guests, { label: 'Number of guests', min: 1, max: 10000 }),
      staff: [],
      additionalRequirements: clean(form.additionalRequirements, 1000),
    };
  }
  const planning = readWeddingPlanning(form.planning, { draft, validator: v, summary: data });
  v.done();
  return { ...data, planning, fullName: profile.fullName, mobile, city: profile.city };
}

router.post('/request', ...requireClient, asyncHandler(async (req, res) => {
  const profile = await ClientProfile.findById(req.user.clientProfile);
  const existing = await ClientRequest.findOne({ user: req.user._id });
  if (existing?.pendingRevision?.fields) throw new AppError(409, 'REVISION_PENDING', 'Review the admin changes before editing this booking.');
  // A submitted (signed) request is never edited in place; changes go through /request/submit.
  if (existing?.state === 'submitted' && !existing.weddingDoneAt) return ok(res, { request: present(existing), persisted: false });
  const data = await readRequest(req.body, profile, req.user.mobileNumber, { draft: true });
  const completed = !!existing?.weddingDoneAt;
  const request = await ClientRequest.findOneAndUpdate({ user: req.user._id }, {
    ...data, profile: profile._id,
    ...(completed ? { state: 'draft', status: 'New', weddingDoneAt: null, submittedAt: null, currentDocument: null } : {}),
  }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  ok(res, { request: present(request), persisted: true }, 201);
}));

router.get('/request', ...requireClient, asyncHandler(async (req, res) => {
  const request = await ClientRequest.findOne({ user: req.user._id });
  ok(res, { request: present(request), documentId: request?.currentDocument || null });
}));

router.post('/request/approve-changes', ...requireClient, asyncHandler(async (req, res) => {
  if (req.body.agree !== true) throw new AppError(422, 'AGREEMENT_REQUIRED', 'Review and accept the proposed changes before submitting.');
  const app = await ClientRequest.findOne({ user: req.user._id, state: 'submitted' });
  if (!app?.pendingRevision?.fields) throw new AppError(404, 'NO_PENDING_CHANGES', 'There are no changes waiting for your review.');
  const signature = mediaRef(req.body.signaturePublicId, req.user._id, 'signature');
  if (!signature) throw new AppError(422, 'VALIDATION', 'Upload your signature before submitting.', { signature: 'A valid signature is required.' });

  const revision = app.pendingRevision.fields;
  const profile = await ClientProfile.findById(app.profile);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Client profile not found.');
  const mobile = revision.mobile;
  const duplicate = await User.findOne({ mobileNumber: mobile, _id: mongoose.trusted({ $ne: req.user._id }) });
  if (duplicate) throw new AppError(409, 'MOBILE_IN_USE', 'The updated mobile number is linked to another account.', { mobile: 'This mobile number is already in use.' });

  Object.assign(profile, revision.profile);
  req.user.mobileNumber = mobile;
  await Promise.all([profile.save(), req.user.save()]);
  Object.assign(app, revision.request, {
    fullName: revision.profile.fullName, mobile, city: revision.profile.city,
    signature, submittedAt: new Date(), status: 'New', statusUpdatedAt: new Date(),
    pendingRevision: null,
  });
  if (revision.planning) app.planning = { ...revision.planning, acceptedProposalAt: new Date() };
  if (app.consent) app.consent.acceptedAt = new Date();
  await app.save();
  const { doc } = await ensureDocument('client', app, profile, mobile);
  ok(res, { documentId: doc._id, version: doc.version, status: app.status }, 201);
}));

router.post('/request/complete', ...requireClient, asyncHandler(async (req, res) => {
  const request = await ClientRequest.findOne({ user: req.user._id, state: 'submitted' });
  if (!request) throw new AppError(404, 'NO_BOOKING', 'There is no submitted wedding booking to complete.');
  if (request.pendingRevision?.fields) throw new AppError(409, 'REVISION_PENDING', 'Review the pending booking changes before marking this wedding complete.');
  if (request.weddingDoneAt) throw new AppError(409, 'ALREADY_COMPLETE', 'This wedding is already marked complete.');
  const completedAt = new Date();
  request.bookingHistory.push({
    weddingDate: request.weddingDate, eventType: request.eventType, venue: request.venue,
    eventLocation: request.eventLocation, guests: request.guests, status: request.status, statusUpdatedAt: request.statusUpdatedAt,
    submittedAt: request.submittedAt, completedAt, documentId: request.currentDocument,
  });
  request.weddingDoneAt = completedAt;
  await request.save();
  ok(res, { request: present(request) });
}));

router.post('/request/submit', ...requireClient, asyncHandler(async (req, res) => {
  const profile = await ClientProfile.findById(req.user.clientProfile);
  readProfile(profile.toObject(), { draft: false });
  const previous = await ClientRequest.findOne({ user: req.user._id });
  if (previous?.pendingRevision?.fields) throw new AppError(409, 'REVISION_PENDING', 'Review the admin changes before submitting this booking.');
  const data = await readRequest(req.body, profile, req.user.mobileNumber, { draft: false });
  const v = new Validator();
  const media = readWeddingBriefConsent(req.body, req.user._id, v, previous?.state === 'submitted' ? previous : null);
  v.done();
  const isNewBooking = !!previous?.weddingDoneAt;
  const unchanged = !isNewBooking && previous?.state === 'submitted'
    && media.signature?.publicId === previous.signature?.publicId
    && previous.consent?.termsVersion === WEDDING_BRIEF_VERSION;
  const request = await ClientRequest.findOneAndUpdate(
    { user: req.user._id },
    { ...data, ...media, profile: profile._id, state: 'submitted', status: isNewBooking ? 'New' : previous?.status, weddingDoneAt: null, submittedAt: unchanged ? previous.submittedAt : new Date() },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  const { doc, created, firstVersion } = await ensureDocument('client', request, profile, req.user.mobileNumber);
  if (created && !firstVersion) { request.status = 'New'; await request.save(); } // changed content needs a fresh review
  ok(res, { documentId: doc._id, version: doc.version }, 201);
}));

module.exports = router;
