const { Schema, model, models } = require('mongoose');

const VacancySchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  position: { type: Schema.Types.ObjectId, ref: 'JobPosition', default: null },
  description: { type: String, required: true, maxlength: 3000 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  location: { type: String, trim: true, maxlength: 160, default: '' },
  employmentType: { type: String, trim: true, maxlength: 50, default: 'Event based' },
  payText: { type: String, trim: true, maxlength: 120, default: '' },
  eventDate: Date,
  deadline: { type: Date, required: true, index: true },
  openings: { type: Number, required: true, min: 1, max: 500 },
  selectedCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['open', 'paused', 'closed'], default: 'open', index: true },
  closedReason: { type: String, enum: ['manual', 'deadline', 'filled', null], default: null },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

VacancySchema.index({ status: 1, deadline: 1, createdAt: -1 });
module.exports = models.Vacancy || model('Vacancy', VacancySchema);
