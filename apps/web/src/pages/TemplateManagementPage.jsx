import { useParams } from 'react-router-dom';
import TestCaseTemplateManagement from '@/components/TestCaseTemplateManagement';

export default function TemplateManagementPage() {
  const { projectId } = useParams();

  return <TestCaseTemplateManagement projectId={projectId} />;
}
