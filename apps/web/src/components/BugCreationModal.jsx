import { useState } from 'react';
import { apiClient } from '../lib/apiClient';

/**
 * Modal component for creating a bug from a failed test execution
 */
export default function BugCreationModal({ 
  isOpen = false, 
  executionId = null,
  testCaseId = null,
  testTitle = '',
  initialDescription = '',
  onClose = () => {},
  onSuccess = () => {}
}) {
  const [formData, setFormData] = useState({
    title: testTitle || '',
    description: initialDescription || '',
    severity: 'MAJOR',
    priority: 'P2',
    environment: 'PROD',
    reproducibility: 'ALWAYS',
    affectedVersion: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const projectId = localStorage.getItem('selectedProjectId');

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

    if (!projectId) {
      setError('Project ID is missing');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await apiClient.post(
        `/api/projects/${projectId}/bugs`,
        {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          priority: formData.priority,
          environment: formData.environment,
          reproducibility: formData.reproducibility,
          affectedVersion: formData.affectedVersion,
          executionId: executionId,
          testCaseId: testCaseId,
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onSuccess(response);
        handleClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to create bug');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        title: testTitle || '',
        description: initialDescription || '',
        severity: 'MAJOR',
        priority: 'P2',
        environment: 'PROD',
        reproducibility: 'ALWAYS',
        affectedVersion: ''
      });
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="tt-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg)] p-6 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Create Bug From Test</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                Bug Created Successfully
              </h3>
              <p className="text-[var(--muted)]">
                The bug has been created and added to the bug tracking system.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-700 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                  Bug Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief description of the bug"
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detailed description and steps to reproduce..."
                  rows={4}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                />
              </div>

              {/* Severity & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                    Severity *
                  </label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleChange}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="TRIVIAL">Trivial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                  >
                    <option value="P0">P0 - Blocker</option>
                    <option value="P1">P1 - Critical</option>
                    <option value="P2">P2 - High</option>
                    <option value="P3">P3 - Medium</option>
                    <option value="P4">P4 - Low</option>
                  </select>
                </div>
              </div>

              {/* Environment & Reproducibility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                    Environment *
                  </label>
                  <select
                    name="environment"
                    value={formData.environment}
                    onChange={handleChange}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                  >
                    <option value="PROD">Production</option>
                    <option value="STAGING">Staging</option>
                    <option value="UAT">UAT</option>
                    <option value="DEV">Development</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                    Reproducibility *
                  </label>
                  <select
                    name="reproducibility"
                    value={formData.reproducibility}
                    onChange={handleChange}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                  >
                    <option value="ALWAYS">Always</option>
                    <option value="INTERMITTENT">Intermittent</option>
                    <option value="RARELY">Rarely</option>
                    <option value="UNREPRODUCIBLE">Cannot Reproduce</option>
                  </select>
                </div>
              </div>

              {/* Affected Version */}
              <div>
                <label className="block font-semibold text-sm mb-1 text-[var(--foreground)]">
                  Affected Version
                </label>
                <input
                  type="text"
                  name="affectedVersion"
                  value={formData.affectedVersion}
                  onChange={handleChange}
                  placeholder="e.g., 2.1.0"
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                />
              </div>

              {/* Info */}
              {(executionId || testCaseId) && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-3 rounded-lg text-xs">
                  <p className="text-blue-800 dark:text-blue-200">
                    ℹ️ This bug will be linked to this test execution {testCaseId && `and test case`}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 tt-btn tt-btn-primary disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Creating...' : 'Create Bug'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 tt-btn tt-btn-secondary disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
