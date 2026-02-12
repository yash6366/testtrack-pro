import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

export default function TestCaseDetailPage() {
  const { testCaseId } = useParams();
  const navigate = useNavigate();
  const { user, projectId: contextProjectId } = useAuth();

  const [testCase, setTestCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadTestCaseDetails();
  }, [testCaseId]);

  const loadTestCaseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/test-cases/${testCaseId}`);
      setTestCase(response);
      setFormData({
        title: response.title || '',
        description: response.description || '',
        steps: response.steps || '',
        expectedResult: response.expectedResult || '',
        priority: response.priority || 'MEDIUM',
        status: response.status || 'ACTIVE',
      });
    } catch (err) {
      setError(err.message || 'Failed to load test case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setActionLoading(true);
      setSuccessMessage('');
      await apiClient.patch(`/api/test-cases/${testCaseId}`, formData);
      setSuccessMessage('Test case updated successfully');
      setIsEditing(false);
      await loadTestCaseDetails();
    } catch (err) {
      setError(err.message || 'Failed to update test case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTestCase = async () => {
    if (!window.confirm('Are you sure you want to delete this test case?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(`/api/test-cases/${testCaseId}`);
      setSuccessMessage('Test case deleted successfully');
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      setError(err.message || 'Failed to delete test case');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Cases"
        headerTitle="Test Case Details"
      >
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !testCase) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Cases"
        headerTitle="Test Case Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!testCase) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Cases"
        headerTitle="Test Case Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded">
            Test case not found
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Test Cases"
      headerTitle={testCase.title}
      headerSubtitle={testCase.description}
    >
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          ← Back
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

        {/* Test Case Details Card */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-xl font-bold">Test Case Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="tt-btn tt-btn-primary px-4 py-2 text-sm"
              >
                Edit
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {isEditing ? (
              // Edit Form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Steps</label>
                  <textarea
                    name="steps"
                    value={formData.steps}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="1. First step&#10;2. Second step&#10;3. Third step"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Expected Result</label>
                  <textarea
                    name="expectedResult"
                    value={formData.expectedResult}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={actionLoading}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={actionLoading}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="DEPRECATED">Deprecated</option>
                    </select>
                  </div>
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
                        title: testCase.title || '',
                        description: testCase.description || '',
                        steps: testCase.steps || '',
                        expectedResult: testCase.expectedResult || '',
                        priority: testCase.priority || 'MEDIUM',
                        status: testCase.status || 'ACTIVE',
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
              // Display View
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--muted)]">Title</label>
                  <p className="text-lg font-bold mt-1">{testCase.title}</p>
                </div>

                <div>
                  <label className="text-sm text-[var(--muted)]">Description</label>
                  <p className="mt-1 text-[var(--foreground)]">{testCase.description || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[var(--muted)]">Priority</label>
                    <p className="text-lg font-medium mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        testCase.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-600 dark:text-red-300' :
                        testCase.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-300' :
                        testCase.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300' :
                        'bg-green-500/10 text-green-600 dark:text-green-300'
                      }`}>
                        {testCase.priority}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-[var(--muted)]">Status</label>
                    <p className="text-lg font-medium mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        testCase.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600 dark:text-green-300' :
                        testCase.status === 'INACTIVE' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-300' :
                        'bg-red-500/10 text-red-600 dark:text-red-300'
                      }`}>
                        {testCase.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[var(--muted)]">Steps</label>
                  <div className="mt-2 bg-[var(--bg-elevated)] p-4 rounded whitespace-pre-wrap text-sm font-mono">
                    {testCase.steps || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[var(--muted)]">Expected Result</label>
                  <div className="mt-2 bg-[var(--bg-elevated)] p-4 rounded">
                    {testCase.expectedResult || '-'}
                  </div>
                </div>

                {testCase.createdAt && (
                  <div className="text-xs text-[var(--muted)]">
                    Created {new Date(testCase.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Card */}
        {!isEditing && (
          <div className="tt-card">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold">Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={handleDeleteTestCase}
                disabled={actionLoading}
                className="w-full tt-btn tt-btn-danger py-2 text-sm"
              >
                {actionLoading ? 'Processing...' : 'Delete Test Case'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
