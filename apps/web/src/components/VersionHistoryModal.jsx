import { useState, useEffect } from 'react';
import axios from 'axios';

const VersionHistoryModal = ({ isOpen, onClose, testCaseId, project }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    if (isOpen && testCaseId) {
      fetchVersions();
    }
  }, [isOpen, testCaseId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/test-cases/${testCaseId}/versions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setVersions(response.data.versions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch version history');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (versionId) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter((id) => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    } else {
      // Replace the first selected with the new one
      setSelectedVersions([selectedVersions[1], versionId]);
    }
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/test-cases/${testCaseId}/versions/compare?v1=${selectedVersions[0]}&v2=${selectedVersions[1]}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setComparisonData(response.data);
      setShowComparison(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to compare versions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (!isOpen) return null;

  if (showComparison && comparisonData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Version Comparison</h2>
            <button
              onClick={() => setShowComparison(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Version 1 */}
            <div className="border rounded-lg p-4">
              <div className="mb-3 pb-3 border-b">
                <h3 className="font-semibold text-lg text-blue-600">Version {comparisonData.version1.version}</h3>
                <p className="text-sm text-gray-600">
                  {formatDate(comparisonData.version1.createdAt)} by {comparisonData.version1.user.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.name ? 'text-orange-600' : 'text-gray-700'}`}>Name</p>
                  <p className="text-sm">{comparisonData.version1.name}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.description ? 'text-orange-600' : 'text-gray-700'}`}>Description</p>
                  <p className="text-sm">{comparisonData.version1.description || 'N/A'}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.type ? 'text-orange-600' : 'text-gray-700'}`}>Type</p>
                  <p className="text-sm">{comparisonData.version1.type}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.priority ? 'text-orange-600' : 'text-gray-700'}`}>Priority</p>
                  <p className="text-sm">{comparisonData.version1.priority}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.status ? 'text-orange-600' : 'text-gray-700'}`}>Status</p>
                  <p className="text-sm">{comparisonData.version1.status}</p>
                </div>

                {comparisonData.differences.steps && (
                  <div>
                    <p className="text-sm font-medium text-orange-600">Steps (Changed)</p>
                    <div className="text-sm bg-orange-50 p-2 rounded mt-1">
                      {JSON.parse(comparisonData.version1.steps || '[]').length} step(s)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Version 2 */}
            <div className="border rounded-lg p-4">
              <div className="mb-3 pb-3 border-b">
                <h3 className="font-semibold text-lg text-green-600">Version {comparisonData.version2.version}</h3>
                <p className="text-sm text-gray-600">
                  {formatDate(comparisonData.version2.createdAt)} by {comparisonData.version2.user.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.name ? 'text-orange-600' : 'text-gray-700'}`}>Name</p>
                  <p className="text-sm">{comparisonData.version2.name}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.description ? 'text-orange-600' : 'text-gray-700'}`}>Description</p>
                  <p className="text-sm">{comparisonData.version2.description || 'N/A'}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.type ? 'text-orange-600' : 'text-gray-700'}`}>Type</p>
                  <p className="text-sm">{comparisonData.version2.type}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.priority ? 'text-orange-600' : 'text-gray-700'}`}>Priority</p>
                  <p className="text-sm">{comparisonData.version2.priority}</p>
                </div>

                <div>
                  <p className={`text-sm font-medium ${comparisonData.differences.status ? 'text-orange-600' : 'text-gray-700'}`}>Status</p>
                  <p className="text-sm">{comparisonData.version2.status}</p>
                </div>

                {comparisonData.differences.steps && (
                  <div>
                    <p className="text-sm font-medium text-orange-600">Steps (Changed)</p>
                    <div className="text-sm bg-orange-50 p-2 rounded mt-1">
                      {JSON.parse(comparisonData.version2.steps || '[]').length} step(s)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!comparisonData.hasChanges && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">✓ No changes detected between these versions</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowComparison(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Version History</h2>
            <p className="text-sm text-gray-600 mt-1">Select two versions to compare</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {selectedVersions.length === 2 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleCompare}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Compare Selected Versions
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No version history available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, _index) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVersions.includes(version.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleVersionSelect(version.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-sm font-semibold">
                        v{version.version}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{version.name}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(version.createdAt)} by {version.user.name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded">{version.type}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">{version.priority}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">{version.status}</span>
                    </div>
                  </div>
                  {selectedVersions.includes(version.id) && (
                    <div className="ml-4">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistoryModal;
