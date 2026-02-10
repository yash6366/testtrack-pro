import RealtimeDiscussionModal from '@/components/RealtimeDiscussionModal';
import { uploadExecutionEvidence } from '@/lib/evidenceUploader';

/**
 * TestExecutionComments Component
 * Allows testers to add comments and evidence notes during test execution
 * @param {number|string} projectId - The project ID
 * @param {number|string} testExecutionId - The test execution ID
 * @param {number|string} stepId - The execution step ID
 * @param {string} testName - The test name
 * @param {function} onClose - Callback when closing comments
 */
export default function TestExecutionComments({
  projectId,
  testExecutionId,
  stepId,
  testName,
  onClose,
}) {
  const handleAttachmentUpload = async (file) => {
    if (!projectId || !testExecutionId || !stepId) {
      throw new Error('Project, execution, and step are required for evidence uploads');
    }

    return uploadExecutionEvidence({
      projectId,
      executionId: testExecutionId,
      stepId,
      file,
    });
  };

  return (
    <RealtimeDiscussionModal
      roomId={testExecutionId}
      roomPrefix="execution"
      title="Test Comments"
      subtitle={testName}
      onClose={onClose}
      closeLabel="×"
      messageType="TEST_EXECUTION"
      placeholder="Add test comment or evidence..."
      theme="green"
      roleLabel="Tester"
      emptyMessage="No comments yet. Share your test observations!"
      connectingMessage="⚠ Connecting to chat server..."
      sendButtonLabel="Send"
      allowAttachments
      attachmentAccept="image/png,image/jpeg,video/mp4,video/webm,text/plain,application/json,application/har+json,.har"
      attachmentPrefix="📎 "
      uploadLabel="📎"
      onAttachmentSelected={handleAttachmentUpload}
    />
  );
}
