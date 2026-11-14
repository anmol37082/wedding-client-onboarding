const { Schema, model, models } = require('mongoose');

const JobPositionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  nameKey: { type: String, required: true, unique: true }, // lowercase name, prevents duplicates
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = models.JobPosition || model('JobPosition', JobPositionSchema);
