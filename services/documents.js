const crypto = require('crypto');
const Document = require('../models/Document');
const brand = require('../lib/brand');
const { ageOn } = require('../lib/validate');
const { view } = require('./media');

const iso = (d) => (d ? new Date(d).toISOString() : null);

function clientSnapshot(app, profile, mobile) {
  return {
    type: 'client', documentTitle: 'Wedding planning request and scope brief', brand: brand.name, submittedAt: iso(app.submittedAt),
    person: { name: profile.fullName, mobile, email: profile.email, address: profile.address, city: profile.city },
    event: { date: iso(app.weddingDate), type: app.eventType, venue: app.venue, location: app.eventLocation, guests: app.guests },
    planning: app.planning || {},
    additional: app.additionalRequirements || '',
    consent: { ...app.consent.toObject(), acceptedAt: iso(app.consent.acceptedAt) },
  };
}
function staffSnapshot(app, profile, mobile) {
  return {
    type: 'staff', brand: brand.name, submittedAt: iso(app.submittedAt),
    person: { name: profile.fullName, mobile, email: profile.email, dob: iso(profile.dob), age: ageOn(profile.dob), address: profile.address, city: profile.city },
    professional: {
      position: app.positionName, education: profile.education, skills: profile.skills,
      experienceYears: profile.experienceYears, experienceDetails: profile.experienceDetails,
    },
    consent: { ...app.consent.toObject(), acceptedAt: iso(app.consent.acceptedAt) },
  };
}

// Creates a new document version only when the signed content actually changed.
async function ensureDocument(profileType, app, profile, mobile) {
  const snapshot = (profileType === 'client' ? clientSnapshot : staffSnapshot)(app, profile, mobile);
  const hash = crypto.createHash('sha256').update(JSON.stringify([snapshot, app.photo?.publicId || '', app.signature?.publicId || ''])).digest('hex');
  let latest; let doc; let created = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    latest = await Document.findOne({ application: app._id }).sort({ version: -1 });
    if (latest?.snapshotHash === hash) { doc = latest; break; }
    try {
      doc = await Document.create({
        user: app.user, profileType, application: app._id, documentType: profileType === 'client' ? 'wedding-planning-request' : 'application', version: latest ? latest.version + 1 : 1,
        snapshotHash: hash, snapshot, photoPublicId: app.photo?.publicId, signaturePublicId: app.signature?.publicId,
      });
      created = true;
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
  if (!doc) throw new Error('Could not create a document version.');
  if (String(app.currentDocument || '') !== String(doc._id)) { app.currentDocument = doc._id; await app.save(); }
  return { doc, created, firstVersion: created && !latest };
}

const documentView = (doc) => ({
  id: doc._id, version: doc.version, profileType: doc.profileType, createdAt: doc.createdAt,
  snapshot: { ...doc.snapshot, photoUrl: view({ publicId: doc.photoPublicId }, 500), signatureUrl: view({ publicId: doc.signaturePublicId }, 600) },
});

module.exports = { ensureDocument, documentView };
