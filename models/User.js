const { Schema, model, models } = require('mongoose');

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  mobileNumber: { type: String, sparse: true, unique: true },
  clientProfile: { type: Schema.Types.ObjectId, ref: 'ClientProfile' },
  staffProfile: { type: Schema.Types.ObjectId, ref: 'StaffProfile' },
  // Role changes are performed only by an authenticated administrator.
  staffRole: { type: String, enum: ['applicant', 'employee'], default: 'applicant', index: true },
}, { timestamps: true });

module.exports = models.User || model('User', UserSchema);
