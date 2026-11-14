const legal = require('../config/legal');
const { mediaRef, sameMedia, view } = require('./media');
const { WEDDING_BRIEF_VERSION } = require('../config/wedding');

// Validates consent + live photo + signature. Unchanged resubmissions keep their original timestamps,
// so re-submitting identical content never creates a new document version.
function readConsent(body, userId, v, previous) {
  if (body.termsAccepted !== true) v.fail('termsAccepted', 'You must accept the Terms & Conditions.');
  if (body.ageConfirmed !== true) v.fail('ageConfirmed', 'You must confirm the information and age criteria.');
  if (body.termsVersion !== legal.termsVersion) v.fail('termsAccepted', 'The Terms have been updated. Please reload and accept again.');
  const photo = mediaRef(body.photoPublicId, userId, 'photo');
  const signature = mediaRef(body.signaturePublicId, userId, 'signature');
  if (!photo) v.fail('photo', 'A live photo is required.');
  if (!signature) v.fail('signature', 'A signature is required.');
  if (!photo || !signature) return {};
  const unchanged = previous?.consent && sameMedia(previous.photo, photo) && sameMedia(previous.signature, signature) && previous.consent.termsVersion === legal.termsVersion;
  return {
    consent: { termsAccepted: true, ageConfirmed: true, termsVersion: legal.termsVersion, acceptedAt: unchanged ? previous.consent.acceptedAt : new Date() },
    photo: unchanged ? previous.photo : photo,
    signature: unchanged ? previous.signature : signature,
  };
}

function readWeddingBriefConsent(body, userId, v, previous) {
  if (body.termsAccepted !== true) v.fail('termsAccepted', 'Confirm the wedding brief before submitting.');
  if (body.termsVersion !== WEDDING_BRIEF_VERSION) v.fail('termsAccepted', 'The wedding brief terms have changed. Please reload and review them.');
  const signature = mediaRef(body.signaturePublicId, userId, 'signature');
  if (!signature) v.fail('signature', 'A valid signature is required.');
  if (!signature) return {};
  const unchanged = previous?.consent?.termsVersion === WEDDING_BRIEF_VERSION
    && sameMedia(previous.signature, signature);
  return {
    consent: {
      termsAccepted: true, termsVersion: WEDDING_BRIEF_VERSION,
      ageConfirmed: false,
      acceptedAt: unchanged ? previous.consent.acceptedAt : new Date(),
    },
    signature: unchanged ? previous.signature : signature,
  };
}

const present = (app) => app && ({
  ...app.toObject(),
  photoUrl: view(app.photo, 300), signatureUrl: view(app.signature, 400),
});

module.exports = { readConsent, readWeddingBriefConsent, present };
