const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// All media is stored as "authenticated" assets: it can only be viewed through signed URLs created here.
const folderFor = (userId) => `wedding-onboarding/${userId}`;

function uploadImage(dataUrl, userId, kind) {
  return cloudinary.uploader.upload(dataUrl, {
    folder: folderFor(userId),
    public_id: `${kind}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`,
    type: 'authenticated',
    resource_type: 'image',
    overwrite: false,
  });
}

function uploadCv(dataUrl, userId, mimeType) {
  const isPdf = mimeType === 'application/pdf';
  return cloudinary.uploader.upload(dataUrl, {
    folder: folderFor(userId),
    public_id: `cv-${Date.now()}-${crypto.randomBytes(16).toString('hex')}${isPdf ? '.pdf' : ''}`,
    type: 'authenticated',
    resource_type: isPdf ? 'raw' : 'image',
    overwrite: false,
  });
}

const signedUrl = (publicId, width = 600) =>
  cloudinary.url(publicId, {
    type: 'authenticated', sign_url: true, secure: true,
    transformation: [{ width, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  });

const signedAssetUrl = (publicId, resourceType = 'raw') => cloudinary.url(publicId, {
  resource_type: resourceType, type: 'authenticated', sign_url: true, secure: true,
});

module.exports = { uploadImage, uploadCv, signedUrl, signedAssetUrl, folderFor };
