import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

export default function TestPlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [testPlan, setTestPlan] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [availableTestCases, setAvailableTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddTestCaseModal, setShowAddTestCaseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    if (projectId && planId) {
      loadTestPlanDetails();
      loadTestCases();
    }
  }, [projectId, planId]);

  const loadTestPlanDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(
        `/api/projects/${projectId}/test-plans/${planId}`
      );
      setTestPlan(response.data || response);
      setFormData({
        name: response.name || response.data?.name || '',
        description: response.description || response.data?.description || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load test plan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTestCases = async () => {
    try {
      const response = await apiClient.get(
        `/api/projects/${projectId}/test-plans/${planId}/test-cases`
      );
      setTestCases(response.data || response || []);
    } catch (err) {
      console.error('Failed to load test cases:', err);
    }
  };

  const loadAvailableTestCases = async () => {
    try {
      // Load all test cases for the project
      const response = await apiClient.get(`/api/projects/${projectId}/test-cases`);
      const allCases = response.data || response || [];
      
      // Filter out test cases already in the plan
      const existingIds = testCases.map((tc) => tc.testCaseId || tc.id);
      const available = allCases.filter((tc) => !existingIds.includes(tc.id));
      
      setAvailableTestCases(available);
    } catch (err) {
      console.error('Failed to load available test cases:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.patch(`/api/projects/${projectId}/test-plans/${planId}`, formData);
      setSuccessMessage('Test plan updated successfully');
      setIsEditing(false);
      await loadTestPlanDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update test plan');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTestCase = async (testCaseId) => {
    try {
      setActionLoading(true);
      setError('');
      await apiClient.post(
        `/api/projects/${projectId}/test-plans/${planId}/test-cases`,
        { testCaseId }
      );
      setSuccessMessage('Test case added to plan');
      await loadTestCases();
      await loadAvailableTestCases();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add test case');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTestCase = async (testCaseId) => {
    if (!confirm('Remove this test case from the plan?')) return;

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(
        `/api/projects/${projectId}/test-plans/${planId}/test-cases/${testCaseId}`
      );
      setSuccessMessage('Test case removed from plan');
      await loadTestCases();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to remove test case');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!confirm('Are you sure you want to delete this test plan? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(`/api/projects/${projectId}/test-plans/${planId}`);
      setSuccessMessage('Test plan deleted successfully');
      setTimeout(() => navigate('/test-plans?projectId=' + projectId), 1500);
    } catch (err) {
      setError(err.message || 'Failed to delete test plan');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAvailableTestCases = availableTestCases.filter((tc) =>
    tc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!projectId) {
    return (
      <DashboardLayout user={user} dashboardLabel="Test Plans" headerTitle="Test Plan Details">
        <div className="p-6 text-center">
          <p className="text-[var(--muted)]">Please select a project</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout user={user} dashboardLabel="Test Plans" headerTitle="Test Plan Details">
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !testPlan) {
    return (
      <DashboardLayout user={user} dashboardLabel="Test Plans" headerTitle="Test Plan Details">
        <div className="p-6">
          <button
            onClick={() => navigate('/test-plans?projectId=' + projectId)}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back to Test Plans
          </button>
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Test Plans"
      headerTitle={testPlan?.name || 'Test Plan Details'}
      headerSubtitle={testPlan?.description}
    >
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/test-plans?projectId=' + projectId)}
          className="text-gray-600 hover:text-gray-900 text-sm"
        >
          ← Back to Test Plans
        </button>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 text-green-800 dark:text-green-200 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Test Plan Details Card */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-xl font-bold">Test Plan Information</h2>
            {!isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeletePlan}
                  disabled={actionLoading}
                  className="tt-btn tt-btn-outline px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plan Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveChanges}
                    disabled={actionLoading}
                    className="tt-btn tt-btn-primary px-4 py-2 text-sm"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: testPlan?.name || '',
                        description: testPlan?.description || '',
                      });
                    }}
                    disabled={actionLoading}
                    className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--muted)]">Plan Name</label>
                  <p className="text-lg font-bold mt-1">{testPlan?.name}</p>
                </div>

                <div>
                  <label className="text-sm text-[var(--muted)]">Description</label>
                  <p className="mt-1 text-[var(--foreground)]">
                    {testPlan?.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
                  <div>
                    <label className="text-sm text-[var(--muted)]">Test Cases</label>
                    <p className="text-2xl font-bold mt-1">{testCases.length}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--muted)]">Created</label>
                    <p className="text-sm mt-1">
                      {testPlan?.createdAt
                        ? new Date(testPlan.createdAt).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--muted)]">Last Updated</label>
                    <p className="text-sm mt-1">
                      {testPlan?.updatedAt
                        ? new Date(testPlan.updatedAt).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Cases Section */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-xl font-bold">Test Cases ({testCases.length})</h2>
            <button
              onClick={() => {
                loadAvailableTestCases();
                setShowAddTestCaseModal(true);
              }}
              className="tt-btn tt-btn-primary px-4 py-2 text-sm"
            >
              + Add Test Cases
            </button>
          </div>

          <div className="p-6">
            {testCases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--muted)] mb-4">No test cases in this plan yet</p>
                <button
                  onClick={() => {
                    loadAvailableTestCases();
                    setShowAddTestCaseModal(true);
                  }}
                  className="tt-btn tt-btn-primary px-6 py-2 text-sm"
                >
                  Add Your First Test Case
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Test Case
                      </th>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {testCases.map((tc) => {
                      const testCase = tc.testCase || tc;
                      return (
                        <tr key={tc.id || testCase.id} className="hover:bg-[var(--hover-bg)]">
                          <td className="px-6 py-4">
                            <div className="font-medium text-[var(--foreground)]">
                              {testCase.title || testCase.name || 'Untitled'}
                            </div>
                            {testCase.description && (
                              <div className="text-sm text-[var(--muted)] mt-1 line-clamp-1">
                                {testCase.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                testCase.priority === 'HIGH'
                                  ? 'bg-red-500/10 text-red-600'
                                  : testCase.priority === 'MEDIUM'
                                  ? 'bg-yellow-500/10 text-yellow-600'
                                  : 'bg-green-500/10 text-green-600'
                              }`}
                            >
                              {testCase.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[var(--muted)]">
                              {testCase.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                navigate(`/test-cases/${testCase.id}`)
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleRemoveTestCase(tc.testCaseId || testCase.id)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Test Case Modal */}
      {showAddTestCaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Add Test Cases to Plan
                </h2>
                <button
                  onClick={() => {
                    setShowAddTestCaseModal(false);
                    setSearchQuery('');
                  }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredAvailableTestCases.length === 0 ? (
                <p className="text-center text-[var(--muted)] py-8">
                  {availableTestCases.length === 0
                    ? 'All test cases are already in this plan'
                    : 'No test cases found'}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAvailableTestCases.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex justify-between items-center p-3 border border-[var(--border)] rounded hover:bg-[var(--hover-bg)]"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[var(--foreground)]">
                          {tc.title || tc.name}
                        </p>
                        {tc.description && (
                          <p className="text-sm text-[var(--muted)] mt-1 line-clamp-1">
                            {tc.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddTestCase(tc.id)}
                        disabled={actionLoading}
                        className="tt-btn tt-btn-primary px-3 py-1.5 text-sm ml-4"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
