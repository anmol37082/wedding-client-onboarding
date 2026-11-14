const { Schema, model, models } = require('mongoose');

const OtpSchema = new Schema({
  email: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  windowStart: { type: Date, required: true },
  sendCount: { type: Number, default: 1 },
});
module.exports = models.Otp || model('Otp', OtpSchema);
