import { useState } from 'react';

export default function RequestRetestModal({ bugId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    note: '',
    expectedOutcome: '',
    testEnvironment: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.note.trim()) {
      setError('Please provide a note about the fix');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/developer/bugs/${bugId}/request-retest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to request retest');

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg)] rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold">Request Retest</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded">
              {error}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-sm font-semibold block mb-2">
              Fix Summary *
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Describe what you fixed and any important details for the tester..."
              rows="4"
              className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Expected Outcome */}
          <div>
            <label className="text-sm font-semibold block mb-2">
              Expected Outcome
            </label>
            <textarea
              value={formData.expectedOutcome}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedOutcome: e.target.value }))}
              placeholder="What should happen after the fix..."
              rows="3"
              className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Test Environment */}
          <div>
            <label className="text-sm font-semibold block mb-2">
              Test Environment
            </label>
            <input
              type="text"
              value={formData.testEnvironment}
              onChange={(e) => setFormData(prev => ({ ...prev, testEnvironment: e.target.value }))}
              placeholder="e.g., Production, Staging, Development"
              className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
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
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Requesting...' : 'Request Retest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
