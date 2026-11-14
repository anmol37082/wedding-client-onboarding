const { Schema, model, models } = require('mongoose');
const { MediaSchema, ConsentSchema } = require('./shared');
const { STAFF_STATUSES } = require('../config/options');

const StaffApplicationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  profile: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
  state: { type: String, enum: ['draft', 'submitted'], default: 'draft', index: true },
  status: { type: String, enum: STAFF_STATUSES, default: 'Pending', index: true },
  position: { type: Schema.Types.ObjectId, ref: 'JobPosition', index: true },
  positionName: String,
  consent: ConsentSchema,
  photo: MediaSchema,
  signature: MediaSchema,
  submittedAt: Date,
  reviewedAt: Date,
  currentDocument: { type: Schema.Types.ObjectId, ref: 'Document' },
  fullName: { type: String, index: true },
  mobile: { type: String, index: true },
  city: String,
  experienceYears: Number,
}, { timestamps: true });
StaffApplicationSchema.index({ state: 1, createdAt: -1 });

module.exports = models.StaffApplication || model('StaffApplication', StaffApplicationSchema);
