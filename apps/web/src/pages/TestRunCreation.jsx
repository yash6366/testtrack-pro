import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { apiClient } from '@/lib/apiClient';

/**
 * TestRunCreation Page
 * Create a new test run and select test cases to execute
 */
export default function TestRunCreation() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const { user } = useAuth();

  const storedProjectId = localStorage.getItem('selectedProjectId');
  const projectId = routeProjectId && routeProjectId !== 'default'
    ? routeProjectId
    : storedProjectId;

  const [testCases, setTestCases] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'QA',
    buildVersion: '',
  });

  // Load test cases
  useEffect(() => {
    const loadTestCases = async () => {
      try {
        setLoading(true);
        setError('');

        if (!projectId) {
          setError('No project selected. Please select a project and try again.');
          return;
        }

        // Fetch test cases for project
        // This endpoint should be created in your test routes
        // For now, using a placeholder - you'll need to implement this
        const response = await apiClient.get(
          `/api/projects/${projectId}/test-cases`
        );

        const cases = response?.data || response?.testCases || [];
        setTestCases(Array.isArray(cases) ? cases : []);
      } catch (err) {
        console.error('Error loading test cases:', err);
        setError('Failed to load test cases. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadTestCases();
    }
  }, [projectId]);

  const handleToggleCase = (caseId) => {
    setSelectedCases((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCases.length === testCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(testCases.map((tc) => tc.id));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateTestRun = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Test run name is required');
      return;
    }

    if (selectedCases.length === 0) {
      setError('Please select at least one test case');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (!projectId) {
        setError('No project selected. Please select a project and try again.');
        return;
      }

      const response = await apiClient.post(
        `/api/projects/${projectId}/test-runs`,
        {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          environment: formData.environment || null,
          buildVersion: formData.buildVersion.trim() || null,
          testCaseIds: selectedCases,
        }
      );

      // Navigate to first execution
      if (response.testRun && response.testRun.executions?.length > 0) {
        navigate(
          `/test-execution/${response.testRun.executions[0].id}`
        );
      } else {
        // Fallback to test run details
        navigate(
          `/test-run/${response.testRun.id}`
        );
      }
    } catch (err) {
      console.error('Error creating test run:', err);
      setError(err.message || 'Failed to create test run');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading test cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Create Test Run</h1>
          <p className="text-[var(--muted)]">
            Select test cases and configure your test run
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateTestRun} className="space-y-4">
              {/* Test Run Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Test Run Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Login Feature Testing"
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg 
                    bg-[var(--bg)] text-[var(--foreground)] placeholder-[var(--muted)]
                    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add test run notes..."
                  disabled={submitting}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg 
                    bg-[var(--bg)] text-[var(--foreground)] placeholder-[var(--muted)]
                    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Environment
                </label>
                <select
                  name="environment"
                  value={formData.environment}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg 
                    bg-[var(--bg)] text-[var(--foreground)]
                    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="DEV">Development</option>
                  <option value="QA">QA</option>
                  <option value="STAGING">Staging</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>

              {/* Build Version */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Build Version (Optional)
                </label>
                <input
                  type="text"
                  name="buildVersion"
                  value={formData.buildVersion}
                  onChange={handleInputChange}
                  placeholder="e.g., v1.2.0"
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg 
                    bg-[var(--bg)] text-[var(--foreground)] placeholder-[var(--muted)]
                    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Selected Count */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">{selectedCases.length}</span> test{' '}
                  {selectedCases.length === 1 ? 'case' : 'cases'} selected
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || selectedCases.length === 0}
                className={`w-full tt-btn tt-btn-primary py-3 font-semibold 
                  ${submitting || selectedCases.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                    Creating Test Run...
                  </>
                ) : (
                  '▶ Start Test Execution'
                )}
              </button>
            </form>
          </div>

          {/* Test Cases Section */}
          <div className="lg:col-span-2">
            <div className="tt-card">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg)]">
                <h3 className="font-semibold">
                  Test Cases ({testCases.length})
                </h3>
                {testCases.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedCases.length === testCases.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
              </div>

              {testCases.length === 0 ? (
                <div className="px-6 py-12 text-center text-[var(--muted)]">
                  <p>No test cases available for this project</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {testCases.map((testCase) => (
                    <label
                      key={testCase.id}
                      className="flex items-start p-4 hover:bg-[var(--bg-elevated)] cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCases.includes(testCase.id)}
                        onChange={() => handleToggleCase(testCase.id)}
                        disabled={submitting}
                        className="mt-1 w-4 h-4 cursor-pointer accent-blue-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-[var(--foreground)]">
                          {testCase.name}
                        </div>
                        {testCase.description && (
                          <p className="text-xs text-[var(--muted)] mt-1">
                            {testCase.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {testCase.type && (
                            <span className="text-xs px-2 py-1 bg-[var(--border)] rounded">
                              {testCase.type}
                            </span>
                          )}
                          {testCase.priority && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                testCase.priority === 'P0'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : testCase.priority === 'P1'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {testCase.priority}
                            </span>
                          )}
                          {testCase.steps?.length && (
                            <span className="text-xs text-[var(--muted)]">
                              {testCase.steps.length} steps
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
