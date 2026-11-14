const { Schema, model, models } = require('mongoose');
const { MediaSchema } = require('./shared');

const NoticeSchema = new Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null },
}, { _id: true });

const VacancyApplicationSchema = new Schema({
  vacancy: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profile: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
  stage: { type: String, enum: ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'], default: 'Applied', index: true },
  appliedAt: { type: Date, default: Date.now },
  cv: { publicId: { type: String, required: true }, resourceType: { type: String, enum: ['image', 'raw'], required: true }, fileName: String, mimeType: String },
  photo: { type: MediaSchema, required: true },
  signature: { type: MediaSchema, required: true },
  interviewAt: Date,
  interviewLocation: { type: String, maxlength: 240 },
  joiningDate: Date,
  notifications: { type: [NoticeSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });

VacancyApplicationSchema.index({ vacancy: 1, user: 1 }, { unique: true });
VacancyApplicationSchema.index({ vacancy: 1, stage: 1, appliedAt: -1 });
VacancyApplicationSchema.index({ user: 1, appliedAt: -1 });
module.exports = models.VacancyApplication || model('VacancyApplication', VacancyApplicationSchema);
