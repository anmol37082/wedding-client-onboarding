const { Schema, model, models } = require('mongoose');

const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  sessionVersion: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = models.Admin || model('Admin', AdminSchema);
