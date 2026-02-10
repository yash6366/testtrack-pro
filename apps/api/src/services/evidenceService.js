import { randomUUID } from 'crypto';
import { getPrismaClient } from '../lib/prisma.js';
import { getAllowedFormats, getCloudinary, getCloudinaryFolder, getEvidenceConfig } from '../lib/cloudinary.js';

const prisma = getPrismaClient();

function ensureCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured');
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    throw new Error('Cloudinary API key is not configured');
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary API secret is not configured');
  }
}

function parseId(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a number`);
  }
  return parsed;
}

async function resolveExecutionContext(projectId, executionId, stepId) {
  const execution = await prisma.testExecution.findUnique({
    where: { id: executionId },
    include: {
      testRun: { select: { projectId: true } },
      testCase: { select: { id: true } },
    },
  });

  if (!execution) {
    throw new Error('Test execution not found');
  }

  if (execution.testRun.projectId !== projectId) {
    throw new Error('Execution does not belong to this project');
  }

  let step = null;
  if (stepId) {
    step = await prisma.testExecutionStep.findUnique({
      where: {
        executionId_stepId: {
          executionId: execution.id,
          stepId,
        },
      },
    });

    if (!step) {
      throw new Error('Execution step not found');
    }
  }

  return { execution, step, testCaseId: execution.testCase.id };
}

export async function createSignedEvidenceUpload({
  projectId,
  executionId,
  stepId,
  fileName,
  fileType,
  fileSize,
}) {
  if (!fileType || typeof fileType !== 'string') {
    throw new Error('fileType is required');
  }

  const config = getEvidenceConfig(fileType);
  if (!config) {
    throw new Error('Unsupported file type');
  }

  if (!fileName || typeof fileName !== 'string') {
    throw new Error('fileName is required');
  }

  if (fileSize === undefined || Number.isNaN(Number(fileSize))) {
    throw new Error('fileSize is required');
  }

  if (Number(fileSize) > config.maxBytes) {
    throw new Error('File exceeds size limit');
  }

  ensureCloudinaryConfig();

  const { testCaseId } = await resolveExecutionContext(projectId, executionId, stepId);

  const folder = getCloudinaryFolder({ projectId, testCaseId, executionId, stepId });
  const publicId = `evidence_${randomUUID().replace(/-/g, '')}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const cloudinary = getCloudinary();
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      public_id: publicId,
      resource_type: config.resourceType,
    },
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
    publicId,
    resourceType: config.resourceType,
    allowedFormats: getAllowedFormats(config.resourceType),
    maxBytes: config.maxBytes,
    evidenceType: config.type,
  };
}

export async function createEvidenceRecord({
  projectId,
  executionId,
  stepId,
  payload,
  userId,
}) {
  const { testCaseId } = await resolveExecutionContext(projectId, executionId, stepId);

  const {
    publicId,
    resourceType,
    secureUrl,
    bytes,
    format,
    originalFilename,
  } = payload;

  if (!publicId || !secureUrl || !resourceType || !bytes || !format) {
    throw new Error('Missing required Cloudinary fields');
  }

  const normalizedFormat = String(format).toLowerCase();
  const normalizedResourceType = String(resourceType).toLowerCase();
  const allowedFormats = getAllowedFormats(normalizedResourceType);

  if (allowedFormats.length > 0 && !allowedFormats.includes(normalizedFormat)) {
    throw new Error('Unsupported evidence format');
  }

  const parsedBytes = Number(bytes);
  if (!Number.isFinite(parsedBytes) || parsedBytes <= 0) {
    throw new Error('Invalid evidence size');
  }

  const folder = getCloudinaryFolder({ projectId, testCaseId, executionId, stepId });
  if (!publicId.startsWith(`${folder}/`)) {
    throw new Error('publicId does not match expected folder');
  }

  let evidenceType = 'LOG';
  if (normalizedResourceType === 'image') {
    evidenceType = 'SCREENSHOT';
  } else if (normalizedResourceType === 'video') {
    evidenceType = 'VIDEO';
  }

  const evidence = await prisma.testExecutionEvidence.create({
    data: {
      executionId,
      stepId,
      type: evidenceType,
      resourceType: normalizedResourceType,
      publicId,
      secureUrl,
      bytes: parsedBytes,
      format: normalizedFormat,
      originalFilename: originalFilename || publicId,
      uploadedBy: userId,
    },
  });

  return evidence;
}

export async function listEvidence({ projectId, executionId, stepId }) {
  await resolveExecutionContext(projectId, executionId, stepId || null);

  return prisma.testExecutionEvidence.findMany({
    where: {
      executionId,
      stepId: stepId || undefined,
      isDeleted: false,
    },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function softDeleteEvidence({ projectId, evidenceId, userId }) {
  const evidence = await prisma.testExecutionEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      execution: {
        include: { testRun: { select: { projectId: true } } },
      },
    },
  });

  if (!evidence || evidence.isDeleted) {
    throw new Error('Evidence not found');
  }

  if (evidence.execution.testRun.projectId !== projectId) {
    throw new Error('Evidence does not belong to this project');
  }

  return prisma.testExecutionEvidence.update({
    where: { id: evidenceId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });
}

export function parseEvidenceParams(params) {
  return {
    projectId: parseId(params.projectId, 'projectId'),
    executionId: parseId(params.executionId, 'executionId'),
    stepId: params.stepId ? parseId(params.stepId, 'stepId') : null,
  };
}
