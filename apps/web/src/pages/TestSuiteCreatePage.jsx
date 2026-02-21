import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import BackButton from '@/components/ui/BackButton';

const SUITE_TYPES = ['STATIC', 'DYNAMIC', 'REGRESSION', 'SMOKE', 'SANITY', 'CUSTOM'];
const SUITE_STATUSES = ['ACTIVE', 'ARCHIVED', 'DEPRECATED'];

export default function TestSuiteCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = useMemo(() => searchParams.get('projectId'), [searchParams]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('STATIC');
  const [status, setStatus] = useState('ACTIVE');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!projectId) {
      setError('ProjectId is missing. Please select a project.');
      return;
    }

    if (!name.trim()) {
      setError('Suite name is required.');
      return;
    }

    let durationValue;
    if (estimatedDurationMinutes.trim()) {
      durationValue = Number(estimatedDurationMinutes);
      if (!Number.isFinite(durationValue) || durationValue <= 0) {
        setError('Estimated duration must be a positive number.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        status,
        estimatedDurationMinutes: durationValue,
      };

      const response = await apiClient.post(
        `/api/projects/${projectId}/test-suites`,
        payload
      );

      navigate(`/test-suites/${response.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create test suite');
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          ProjectId is missing. Please select a project from the dashboard.
        </div>
        <div className="mt-4">
          <BackButton label="Back to Test Suites" fallback="/test-suites" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <BackButton label="Back to Test Suites" fallback="/test-suites" />
        <h1 className="text-2xl font-bold mt-2">Create Test Suite</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create a new test suite for project {projectId}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Suite Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-800"
            placeholder="Regression Suite"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-800"
            rows={3}
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800"
            >
              {SUITE_TYPES.map((suiteType) => (
                <option key={suiteType} value={suiteType}>
                  {suiteType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800"
            >
              {SUITE_STATUSES.map((suiteStatus) => (
                <option key={suiteStatus} value={suiteStatus}>
                  {suiteStatus}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Estimated Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={estimatedDurationMinutes}
            onChange={(event) => setEstimatedDurationMinutes(event.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-800"
            placeholder="60"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Suite'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/test-suites')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
