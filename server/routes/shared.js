const router = require('express').Router();
const Document = require('../../models/Document');
const JobPosition = require('../../models/JobPosition');
const ClientRequest = require('../../models/ClientRequest');
const StaffApplication = require('../../models/StaffApplication');
const ClientProfile = require('../../models/ClientProfile');
const StaffProfile = require('../../models/StaffProfile');
const { requireAuth, requireUserOrAdmin } = require('../../middleware/auth');
const { ok, asyncHandler, assertId, AppError } = require('../../lib/http');
const { rateLimit } = require('../../lib/rateLimit');
const { clean } = require('../../lib/validate');
const { uploadImage, uploadCv } = require('../../lib/cloudinary');
const { ensureDocument, documentView } = require('../../services/documents');
const legal = require('../../config/legal');
const options = require('../../config/options');

router.get('/legal', (req, res) => ok(res, legal));
router.get('/options', (req, res) => ok(res, {
  eventTypes: options.EVENT_TYPES, educationLevels: options.EDUCATION_LEVELS, skillSuggestions: options.SKILL_SUGGESTIONS,
}));
router.get('/job-positions', asyncHandler(async (req, res) =>
  ok(res, { positions: await JobPosition.find({ active: true }).sort({ order: 1, name: 1 }).select('name') })));

// Server-side upload: the Cloudinary secret never reaches the browser.
const DATA_URL = /^data:(application\/pdf|image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
function decodeUpload(image, mimeType, maxBytes) {
  if (typeof image !== 'string' || image.length > 2.8e6) return null;
  const match = image.match(DATA_URL);
  if (!match || match[1] !== mimeType) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) return null;
  const valid = mimeType === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : mimeType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return valid ? bytes : null;
}
router.post('/media/upload', requireAuth, rateLimit({ windowMs: 3600e3, max: 40, key: (r) => String(r.user._id) }), asyncHandler(async (req, res) => {
  const { kind, image, mimeType, fileName } = req.body;
  if (kind === 'cv') {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    const bytes = allowed.includes(mimeType) ? decodeUpload(image, mimeType, 2e6) : null;
    if (!bytes) {
      throw new AppError(422, 'VALIDATION', 'Upload a PDF or image CV up to 2 MB.', { cv: 'Use PDF, PNG or JPG up to 2 MB.' });
    }
    const r = await uploadCv(image, req.user._id, mimeType);
    return ok(res, { publicId: r.public_id, resourceType: mimeType === 'application/pdf' ? 'raw' : 'image', fileName: clean(fileName, 120) || 'CV', mimeType }, 201);
  }
  if (!['photo', 'signature'].includes(kind)) throw new AppError(422, 'VALIDATION', 'Invalid upload type.');
  const imageType = typeof image === 'string' ? image.slice(0, 24).match(/^data:(image\/(?:png|jpeg));base64,/)?.[1] : null;
  if (!imageType || !decodeUpload(image, imageType, 2e6)) throw new AppError(422, 'VALIDATION', 'Invalid or oversized image.');
  const r = await uploadImage(image, req.user._id, kind);
  ok(res, { publicId: r.public_id }, 201);
}));

// POST creates (or returns the existing) document for the caller's submitted application. Never duplicates.
router.post('/documents', requireAuth, asyncHandler(async (req, res) => {
  const type = req.body.profileType;
  if (!['client', 'staff'].includes(type)) throw new AppError(422, 'VALIDATION', 'Invalid profile type.');
  const [App, Profile] = type === 'client' ? [ClientRequest, ClientProfile] : [StaffApplication, StaffProfile];
  const app = await App.findOne({ user: req.user._id, state: 'submitted' });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'No submitted application found.');
  const profile = await Profile.findById(app.profile);
  const { doc } = await ensureDocument(type, app, profile, req.user.mobileNumber);
  ok(res, { document: documentView(doc) });
}));

router.get('/documents/:id', requireUserOrAdmin, asyncHandler(async (req, res) => {
  const doc = await Document.findById(assertId(req.params.id));
  const owner = req.user && String(doc?.user) === String(req.user._id);
  if (!doc || (!owner && !req.admin)) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  ok(res, { document: documentView(doc) });
}));

module.exports = router;
