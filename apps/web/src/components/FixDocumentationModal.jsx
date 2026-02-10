import { useState, useEffect } from 'react';

export default function FixDocumentationModal({ bugId, bugData, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fixStrategy: bugData?.fixStrategy || '',
    rootCauseAnalysis: bugData?.rootCauseAnalysis || '',
    rootCauseCategory: bugData?.rootCauseCategory || '',
    fixedInCommitHash: bugData?.fixedInCommitHash || '',
    fixBranchName: bugData?.fixBranchName || '',
    codeReviewUrl: bugData?.codeReviewUrl || '',
    actualFixHours: bugData?.actualFixHours || '',
    targetFixVersion: bugData?.targetFixVersion || '',
    fixedInVersion: bugData?.fixedInVersion || '',
  });

  const rootCauseCategories = [
    'DESIGN_DEFECT',
    'IMPLEMENTATION_ERROR',
    'REQUIREMENT_MISMATCH',
    'ENVIRONMENT_ISSUE',
    'INTEGRATION_ISSUE',
    'PERFORMANCE_ISSUE',
    'SECURITY_ISSUE',
    'UNKNOWN',
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fixStrategy.trim()) {
      setError('Please provide a fix strategy/solution');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/developer/bugs/${bugId}/fix-documentation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update fix documentation');

      setError(null);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[var(--bg)] rounded-lg shadow-lg w-full max-w-4xl mx-4 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg)]">
          <div>
            <h2 className="text-2xl font-bold">Fix Documentation & Traceability</h2>
            <p className="text-sm text-[var(--muted)] mt-1">Document your solution, root cause, and link commits</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          {/* Solution & Analysis Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Solution & Analysis</h3>

            {/* Fix Strategy */}
            <div>
              <label className="text-sm font-semibold block mb-2">
                Fix Strategy / Solution *
              </label>
              <textarea
                value={formData.fixStrategy}
                onChange={(e) => handleInputChange('fixStrategy', e.target.value)}
                placeholder="Describe the fix you implemented, what was changed, and why it resolves the issue..."
                rows="4"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            {/* Root Cause Analysis */}
            <div>
              <label className="text-sm font-semibold block mb-2">
                Root Cause Analysis
              </label>
              <textarea
                value={formData.rootCauseAnalysis}
                onChange={(e) => handleInputChange('rootCauseAnalysis', e.target.value)}
                placeholder="Explain why the bug occurred, what was the root cause..."
                rows="3"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* Root Cause Category */}
            <div>
              <label className="text-sm font-semibold block mb-2">
                Root Cause Category
              </label>
              <select
                value={formData.rootCauseCategory}
                onChange={(e) => handleInputChange('rootCauseCategory', e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Select a category...</option>
                {rootCauseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Git Traceability Section */}
          <div className="space-y-4 border-t border-[var(--border)] pt-6">
            <h3 className="text-lg font-semibold">Git Commit & Branch Information</h3>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Commit Hash
              </label>
              <input
                type="text"
                value={formData.fixedInCommitHash}
                onChange={(e) => handleInputChange('fixedInCommitHash', e.target.value)}
                placeholder="e.g., abc123def456... or leave empty if not committed yet"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Link the Git commit that contains the fix
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Branch Name
              </label>
              <input
                type="text"
                value={formData.fixBranchName}
                onChange={(e) => handleInputChange('fixBranchName', e.target.value)}
                placeholder="e.g., feature/fix-login-issue, bugfix/memory-leak"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                The branch where the fix was implemented
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Code Review URL
              </label>
              <input
                type="url"
                value={formData.codeReviewUrl}
                onChange={(e) => handleInputChange('codeReviewUrl', e.target.value)}
                placeholder="e.g., https://github.com/org/repo/pull/123"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Link to pull request or code review
              </p>
            </div>
          </div>

          {/* Version & Timing Section */}
          <div className="space-y-4 border-t border-[var(--border)] pt-6">
            <h3 className="text-lg font-semibold">Version & Timeline</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Target Fix Version
                </label>
                <input
                  type="text"
                  value={formData.targetFixVersion}
                  onChange={(e) => handleInputChange('targetFixVersion', e.target.value)}
                  placeholder="e.g., 1.2.0, 2024-02"
                  className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">
                  Fixed In Version
                </label>
                <input
                  type="text"
                  value={formData.fixedInVersion}
                  onChange={(e) => handleInputChange('fixedInVersion', e.target.value)}
                  placeholder="e.g., 1.2.0 (actual release version)"
                  className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Actual Fix Hours
              </label>
              <input
                type="number"
                value={formData.actualFixHours}
                onChange={(e) => handleInputChange('actualFixHours', e.target.value)}
                placeholder="Hours spent on fixing this issue"
                min="0"
                step="0.5"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Preview Section */}
          {(formData.fixedInCommitHash || formData.fixBranchName) && (
            <div className="space-y-4 border-t border-[var(--border)] pt-6 bg-[var(--bg-elevated)] p-4 rounded-lg">
              <h3 className="text-sm font-semibold">Git Traceability Preview</h3>
              <div className="space-y-2 text-sm font-mono">
                {formData.fixBranchName && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">Branch:</span>
                    <span className="bg-[var(--bg)] px-2 py-1 rounded text-indigo-600 dark:text-indigo-400">
                      {formData.fixBranchName}
                    </span>
                  </div>
                )}
                {formData.fixedInCommitHash && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">Commit:</span>
                    <span className="bg-[var(--bg)] px-2 py-1 rounded text-emerald-600 dark:text-emerald-400">
                      {formData.fixedInCommitHash.substring(0, 8)}...
                    </span>
                  </div>
                )}
                {formData.codeReviewUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">Review:</span>
                    <a
                      href={formData.codeReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View PR
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-[var(--bg-elevated)] text-[var(--text)] rounded-lg hover:bg-[var(--bg-elevated-hover)] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? 'Saving...' : 'Save Fix Documentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
