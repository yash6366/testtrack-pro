import apiClient from '@/lib/apiClient';

function buildUploadUrl(cloudName, resourceType) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

async function uploadToCloudinary({
  cloudName,
  resourceType,
  signature,
  timestamp,
  apiKey,
  folder,
  publicId,
  file,
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', publicId);

  const uploadUrl = buildUploadUrl(cloudName, resourceType);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
    throw new Error(errorBody?.error?.message || 'Cloudinary upload failed');
  }

  return response.json();
}

export async function uploadExecutionEvidence({
  projectId,
  executionId,
  stepId,
  file,
}) {
  if (!projectId || !executionId || !stepId) {
    throw new Error('projectId, executionId, and stepId are required');
  }

  const signaturePayload = await apiClient.post(
    `/api/projects/${projectId}/test-executions/${executionId}/steps/${stepId}/evidence/signature`,
    {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }
  );

  const uploadResult = await uploadToCloudinary({
    cloudName: signaturePayload.cloudName,
    resourceType: signaturePayload.resourceType,
    signature: signaturePayload.signature,
    timestamp: signaturePayload.timestamp,
    apiKey: signaturePayload.apiKey,
    folder: signaturePayload.folder,
    publicId: signaturePayload.publicId,
    file,
  });

  const evidenceRecord = await apiClient.post(
    `/api/projects/${projectId}/test-executions/${executionId}/steps/${stepId}/evidence`,
    {
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      secureUrl: uploadResult.secure_url,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      originalFilename: uploadResult.original_filename,
    }
  );

  return {
    evidence: evidenceRecord,
    upload: uploadResult,
  };
}
