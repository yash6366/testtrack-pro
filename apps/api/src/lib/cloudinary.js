import { v2 as cloudinary } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER_ROOT = 'testtrack-pro',
  CLOUDINARY_MAX_BYTES_IMAGE = '5242880',
  CLOUDINARY_MAX_BYTES_VIDEO = '52428800',
  CLOUDINARY_MAX_BYTES_LOG = '1048576',
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Cloudinary credentials are not fully configured.');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const evidenceLimits = {
  image: Number.parseInt(CLOUDINARY_MAX_BYTES_IMAGE, 10) || 5242880,
  video: Number.parseInt(CLOUDINARY_MAX_BYTES_VIDEO, 10) || 52428800,
  log: Number.parseInt(CLOUDINARY_MAX_BYTES_LOG, 10) || 1048576,
};

const allowedFormatsByResource = {
  image: ['png', 'jpg', 'jpeg'],
  video: ['mp4', 'webm'],
  raw: ['txt', 'json', 'har'],
};

const mimeConfig = {
  'image/png': { type: 'SCREENSHOT', resourceType: 'image', maxBytes: evidenceLimits.image },
  'image/jpeg': { type: 'SCREENSHOT', resourceType: 'image', maxBytes: evidenceLimits.image },
  'image/jpg': { type: 'SCREENSHOT', resourceType: 'image', maxBytes: evidenceLimits.image },
  'video/mp4': { type: 'VIDEO', resourceType: 'video', maxBytes: evidenceLimits.video },
  'video/webm': { type: 'VIDEO', resourceType: 'video', maxBytes: evidenceLimits.video },
  'text/plain': { type: 'LOG', resourceType: 'raw', maxBytes: evidenceLimits.log },
  'application/json': { type: 'LOG', resourceType: 'raw', maxBytes: evidenceLimits.log },
  'application/har+json': { type: 'LOG', resourceType: 'raw', maxBytes: evidenceLimits.log },
};

export function getEvidenceConfig(fileType) {
  return mimeConfig[fileType] || null;
}

export function getAllowedFormats(resourceType) {
  return allowedFormatsByResource[resourceType] || [];
}

export function getCloudinaryFolder({ projectId, testCaseId, executionId, stepId }) {
  const base = CLOUDINARY_FOLDER_ROOT.trim() || 'testtrack-pro';
  return `${base}/project_${projectId}/case_${testCaseId}/execution_${executionId}/step_${stepId}`;
}

export function getCloudinary() {
  return cloudinary;
}
