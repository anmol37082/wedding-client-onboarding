const { signedUrl, folderFor } = require('../lib/cloudinary');
const { AppError } = require('../lib/http');

// Turns a stored media reference into something the browser can display (signed, resized).
const view = (m, width) => (m?.publicId ? signedUrl(m.publicId, width) : null);

// A user may only attach media that was uploaded into their own folder.
function mediaRef(publicId, userId, kind) {
  const prefix = `${folderFor(userId)}/${kind}-`;
  const safeId = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d{13}(?:-[a-f\\d]{32})?$`);
  if (typeof publicId !== 'string' || !safeId.test(publicId)) return null;
  return { publicId, capturedAt: new Date() };
}
const sameMedia = (a, b) => !!a?.publicId && a.publicId === b?.publicId;

module.exports = { view, mediaRef, sameMedia, AppError };
