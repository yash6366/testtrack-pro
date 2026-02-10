import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

/**
 * Component for creating a new bug (from failed test execution)
 */
export default function BugCreationForm({ executionId = null, testCaseId = null, onSuccess = null, onCancel = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MAJOR',
    priority: 'P2',
    environment: 'PROD',
    reproducibility: 'ALWAYS',
    affectedVersion: '',
    projectId: localStorage.getItem('selectedProjectId') || '',
    sourceExecutionId: executionId,
    sourceTestCaseId: testCaseId
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.projectId) {
      setError('Please select a project');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await apiClient.post(
        `/api/projects/${formData.projectId}/bugs`,
        {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          priority: formData.priority,
          environment: formData.environment,
          reproducibility: formData.reproducibility,
          affectedVersion: formData.affectedVersion || 'Unknown',
          testCaseId: formData.sourceTestCaseId || undefined,
          executionId: formData.sourceExecutionId || undefined,
          assigneeId: undefined,
        }
      );

      setSuccess(true);

      if (onSuccess) {
        onSuccess(response);
      } else {
        // Redirect to bug details after a short delay
        setTimeout(() => {
          navigate(`/bugs/${response.id}`);
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Failed to create bug');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Report Bug
          </h1>
          <p className="text-[var(--muted)] mb-6">
            Create a new bug report for the project
          </p>
        </div>

        {success ? (
          <div className="tt-card p-8 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
              ✓ Bug Created Successfully
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Your bug report has been created. You will be redirected shortly...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="tt-card p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Project Selection */}
            <div>
              <label className="block font-semibold mb-2 text-[var(--foreground)]">
                Project *
              </label>
              <input
                type="text"
                value={formData.projectId}
                disabled
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--border)] text-[var(--muted)] opacity-70"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Project is pre-selected from your current session
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block font-semibold mb-2 text-[var(--foreground)]">
                Bug Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Brief description of the bug"
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold mb-2 text-[var(--foreground)]">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed description, steps to reproduce, expected vs actual behavior..."
                rows={6}
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
              />
            </div>

            {/* Severity & Priority Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold mb-2 text-[var(--foreground)]">
                  Severity *
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                >
                  <option value="CRITICAL">Critical - System Down</option>
                  <option value="MAJOR">Major - Major Functionality Broken</option>
                  <option value="MINOR">Minor - Minor Feature Not Working</option>
                  <option value="TRIVIAL">Trivial - Cosmetic Issues</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2 text-[var(--foreground)]">
                  Priority *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                >
                  <option value="P0">P0 - Blocker</option>
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
            </div>

            {/* Environment & Reproducibility Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold mb-2 text-[var(--foreground)]">
                  Environment *
                </label>
                <select
                  name="environment"
                  value={formData.environment}
                  onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                >
                  <option value="PROD">Production</option>
                  <option value="STAGING">Staging</option>
                  <option value="UAT">UAT</option>
                  <option value="DEV">Development</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2 text-[var(--foreground)]">
                  Reproducibility *
                </label>
                <select
                  name="reproducibility"
                  value={formData.reproducibility}
                  onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                >
                  <option value="ALWAYS">Always Reproducible</option>
                  <option value="INTERMITTENT">Intermittent</option>
                  <option value="RARELY">Rarely Reproducible</option>
                  <option value="UNREPRODUCIBLE">Cannot Reproduce</option>
                </select>
              </div>
            </div>

            {/* Affected Version */}
            <div>
              <label className="block font-semibold mb-2 text-[var(--foreground)]">
                Affected Version
              </label>
              <input
                type="text"
                name="affectedVersion"
                value={formData.affectedVersion}
                onChange={handleChange}
                placeholder="e.g., 2.1.0, v3.0.0-alpha"
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
              />
            </div>

            {/* Additional Info */}
            {(executionId || testCaseId) && (
              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Note:</strong> This bug is linked to a {testCaseId ? 'test case' : 'test execution'}
                  {testCaseId && ` (Test Case ID: ${testCaseId})`}
                  {executionId && ` (Execution ID: ${executionId})`}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 tt-btn tt-btn-primary disabled:opacity-50"
              >
                {submitting ? 'Creating Bug...' : 'Create Bug'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 tt-btn tt-btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
