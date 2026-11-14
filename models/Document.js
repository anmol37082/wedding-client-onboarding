const { Schema, model, models } = require('mongoose');

// A signed document version. Never updated after creation: changes produce a new version.
const DocumentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileType: { type: String, enum: ['client', 'staff'], required: true },
  application: { type: Schema.Types.ObjectId, required: true },
  documentType: { type: String, default: 'application' },
  version: { type: Number, required: true },
  snapshotHash: { type: String, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  photoPublicId: String,
  signaturePublicId: String,
}, { timestamps: true });
DocumentSchema.index({ application: 1, version: -1 }, { unique: true });
DocumentSchema.index({ createdAt: -1 });

module.exports = models.Document || model('Document', DocumentSchema);
