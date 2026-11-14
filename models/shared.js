const { Schema } = require('mongoose');

// Reference to an asset in Cloudinary (never the image itself).
const MediaSchema = new Schema({ publicId: String, capturedAt: Date }, { _id: false });
const ConsentSchema = new Schema({
  termsAccepted: Boolean, termsVersion: String, ageConfirmed: Boolean, acceptedAt: Date,
}, { _id: false });

module.exports = { MediaSchema, ConsentSchema };
