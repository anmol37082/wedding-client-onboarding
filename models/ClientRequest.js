const { Schema, model, models } = require('mongoose');
const { MediaSchema, ConsentSchema } = require('./shared');
const { CLIENT_STATUSES } = require('../config/options');

const ClientRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  profile: { type: Schema.Types.ObjectId, ref: 'ClientProfile', required: true },
  state: { type: String, enum: ['draft', 'submitted'], default: 'draft', index: true },
  status: { type: String, enum: CLIENT_STATUSES, default: 'New', index: true },
  statusUpdatedAt: Date,
  weddingDoneAt: { type: Date, default: null },
  bookingHistory: [{
    _id: false,
    weddingDate: Date, eventType: String, venue: String, eventLocation: String, guests: Number,
    status: String, statusUpdatedAt: Date, submittedAt: Date, completedAt: Date, documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  }],
  weddingDate: { type: Date, index: true },
  eventType: String,
  venue: String,
  eventLocation: String,
  guests: Number,
  planning: { type: Schema.Types.Mixed, default: {} },
  staff: [{ _id: false, position: { type: Schema.Types.ObjectId, ref: 'JobPosition' }, positionName: String, quantity: Number }],
  additionalRequirements: { type: String, default: '' },
  consent: ConsentSchema,
  photo: MediaSchema,
  signature: MediaSchema,
  submittedAt: Date,
  currentDocument: { type: Schema.Types.ObjectId, ref: 'Document' },
  // Admin-proposed changes stay staged until the client reviews and signs them.
  pendingRevision: { type: Schema.Types.Mixed, default: null },
  // Denormalised at save/submit time for fast admin search and tables.
  fullName: { type: String, index: true },
  mobile: { type: String, index: true },
  city: String,
}, { timestamps: true });
ClientRequestSchema.index({ state: 1, createdAt: -1 });
ClientRequestSchema.index({ 'staff.position': 1 });

module.exports = models.ClientRequest || model('ClientRequest', ClientRequestSchema);
