import { useParams } from 'react-router-dom';
import TestCaseManagement from '@/components/TestCaseManagement';

export default function ProjectTestCasesPage() {
  const { projectId } = useParams();

  return <TestCaseManagement projectId={projectId} />;
}
