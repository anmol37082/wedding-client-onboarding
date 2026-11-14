const { Schema, model, models } = require('mongoose');

const StaffProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, default: '' },
  dob: { type: Date },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  education: { type: String, default: '' },
  skills: { type: [String], default: [] },
  experienceYears: { type: Number, default: 0 },
  experienceDetails: { type: String, default: '' },
}, { timestamps: true });
module.exports = models.StaffProfile || model('StaffProfile', StaffProfileSchema);
