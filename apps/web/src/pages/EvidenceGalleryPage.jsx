import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

export default function EvidenceGalleryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all'); // all, images, videos, documents
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    if (projectId) {
      loadEvidence();
    }
  }, [projectId]);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Note: This endpoint would need to be implemented in the API
      // For now, we'll simulate the structure based on the existing evidence API
      const response = await apiClient.get(`/api/projects/${projectId}/evidence`);
      setEvidence(response.evidence || response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to load evidence');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(`/api/projects/${projectId}/evidence/${evidenceId}`);
      setSuccessMessage('Evidence deleted successfully');
      await loadEvidence();
      setShowPreviewModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete evidence');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreview = (item) => {
    setSelectedEvidence(item);
    setShowPreviewModal(true);
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx', 'txt', 'xlsx', 'csv'].includes(ext)) return 'document';
    
    return 'unknown';
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  const filteredEvidence = evidence.filter((item) => {
    const fileName = item.fileName || item.name || '';
    const fileType = getFileType(fileName);
    
    // Apply type filter
    if (filter !== 'all') {
      if (filter === 'images' && fileType !== 'image') return false;
      if (filter === 'videos' && fileType !== 'video') return false;
      if (filter === 'documents' && fileType !== 'document') return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        fileName.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.testCase?.title?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (!projectId) {
    return (
      <DashboardLayout user={user} dashboardLabel="Evidence" headerTitle="Evidence Gallery">
        <div className="p-6 text-center">
          <p className="text-[var(--muted)]">Please select a project to view evidence</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout user={user} dashboardLabel="Evidence" headerTitle="Evidence Gallery">
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Evidence"
      headerTitle="Evidence Gallery"
      headerSubtitle="View and manage all test execution evidence"
    >
      <div className="p-6 space-y-6">
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

        {/* Filters and Search */}
        <div className="tt-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search evidence by filename, description, or test case..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('images')}
                className={`px-4 py-2 rounded text-sm ${
                  filter === 'images'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                Images
              </button>
              <button
                onClick={() => setFilter('videos')}
                className={`px-4 py-2 rounded text-sm ${
                  filter === 'videos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setFilter('documents')}
                className={`px-4 py-2 rounded text-sm ${
                  filter === 'documents'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                Documents
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--border)] text-sm">
            <span className="text-[var(--muted)]">
              Total: <strong className="text-[var(--foreground)]">{evidence.length}</strong>
            </span>
            <span className="text-[var(--muted)]">
              Filtered: <strong className="text-[var(--foreground)]">{filteredEvidence.length}</strong>
            </span>
          </div>
        </div>

        {/* Evidence Grid */}
        {filteredEvidence.length === 0 ? (
          <div className="tt-card p-8 text-center">
            <p className="text-[var(--muted)]">
              {evidence.length === 0
                ? 'No evidence files found in this project'
                : 'No evidence matches your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvidence.map((item) => {
              const fileType = getFileType(item.fileName || item.name);
              const icon = getFileIcon(fileType);

              return (
                <div
                  key={item.id}
                  className="tt-card p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handlePreview(item)}
                >
                  {/* Thumbnail or Icon */}
                  <div className="aspect-video bg-[var(--bg-elevated)] rounded mb-3 flex items-center justify-center overflow-hidden">
                    {fileType === 'image' && item.url ? (
                      <img
                        src={item.url}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Security fix: Use safe DOM manipulation instead of innerHTML
                          e.target.style.display = 'none';
                          const span = document.createElement('span');
                          span.className = 'text-4xl';
                          span.textContent = icon;
                          e.target.parentElement.appendChild(span);
                        }}
                      />
                    ) : (
                      <span className="text-4xl">{icon}</span>
                    )}
                  </div>

                  {/* File Info */}
                  <div>
                    <p className="font-medium text-sm text-[var(--foreground)] truncate mb-1">
                      {item.fileName || item.name || 'Unnamed file'}
                    </p>
                    {item.testCase?.title && (
                      <p className="text-xs text-[var(--muted)] truncate mb-1">
                        Test: {item.testCase.title}
                      </p>
                    )}
                    {item.testExecution && (
                      <p className="text-xs text-[var(--muted)] truncate mb-1">
                        Execution #{item.testExecution.id}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
                      <span>{formatFileSize(item.fileSize || item.size)}</span>
                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : 'Unknown date'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedEvidence && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    {selectedEvidence.fileName || selectedEvidence.name || 'Unnamed file'}
                  </h2>
                  {selectedEvidence.description && (
                    <p className="text-sm text-[var(--muted)]">
                      {selectedEvidence.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedEvidence(null);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Preview Content */}
              <div className="mb-4 bg-[var(--bg-elevated)] rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {getFileType(selectedEvidence.fileName || selectedEvidence.name) === 'image' &&
                selectedEvidence.url ? (
                  <img
                    src={selectedEvidence.url}
                    alt={selectedEvidence.fileName}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                ) : getFileType(selectedEvidence.fileName || selectedEvidence.name) === 'video' &&
                  selectedEvidence.url ? (
                  <video
                    src={selectedEvidence.url}
                    controls
                    className="max-w-full max-h-[60vh]"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">
                      {getFileIcon(getFileType(selectedEvidence.fileName || selectedEvidence.name))}
                    </span>
                    <p className="text-[var(--muted)]">Preview not available</p>
                    {selectedEvidence.url && (
                      <a
                        href={selectedEvidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      >
                        Download File
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t border-[var(--border)] pt-4 mb-4">
                <h3 className="font-semibold mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedEvidence.testCase && (
                    <div>
                      <p className="text-[var(--muted)]">Test Case</p>
                      <p className="font-medium">
                        {selectedEvidence.testCase.title || selectedEvidence.testCase.name}
                      </p>
                    </div>
                  )}
                  {selectedEvidence.testExecution && (
                    <div>
                      <p className="text-[var(--muted)]">Test Execution</p>
                      <p className="font-medium">#{selectedEvidence.testExecution.id}</p>
                    </div>
                  )}
                  {selectedEvidence.step && (
                    <div>
                      <p className="text-[var(--muted)]">Step</p>
                      <p className="font-medium">Step #{selectedEvidence.step.stepNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[var(--muted)]">File Size</p>
                    <p className="font-medium">
                      {formatFileSize(selectedEvidence.fileSize || selectedEvidence.size)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Upload Date</p>
                    <p className="font-medium">
                      {selectedEvidence.createdAt
                        ? new Date(selectedEvidence.createdAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                  {selectedEvidence.uploadedBy && (
                    <div>
                      <p className="text-[var(--muted)]">Uploaded By</p>
                      <p className="font-medium">
                        {selectedEvidence.uploadedBy.name || selectedEvidence.uploadedBy.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                {selectedEvidence.url && (
                  <a
                    href={selectedEvidence.url}
                    download
                    className="tt-btn tt-btn-primary px-4 py-2 text-sm flex-1 text-center"
                  >
                    Download
                  </a>
                )}
                {selectedEvidence.testCase && (
                  <button
                    onClick={() => {
                      navigate(`/test-cases/${selectedEvidence.testCase.id}`);
                      setShowPreviewModal(false);
                    }}
                    className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                  >
                    View Test Case
                  </button>
                )}
                <button
                  onClick={() => handleDeleteEvidence(selectedEvidence.id)}
                  disabled={actionLoading}
                  className="tt-btn tt-btn-outline px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
