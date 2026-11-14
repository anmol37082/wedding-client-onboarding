const { Schema, model, models } = require('mongoose');

const ClientProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
}, { timestamps: true });
module.exports = models.ClientProfile || model('ClientProfile', ClientProfileSchema);
