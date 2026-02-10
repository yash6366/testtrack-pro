import { useState } from 'react';
import axios from 'axios';
import { X, Upload, Download, Trash2, Edit2, Check } from 'lucide-react';

/**
 * BulkTestCaseOperations Component
 * Provides bulk update, delete, export operations for selected test cases
 */
export default function BulkTestCaseOperations({ 
  selectedTestCases = [], 
  projectId, 
  onSuccess, 
  onError,
  onClearSelection 
}) {
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [bulkUpdates, setBulkUpdates] = useState({
    status: '',
    priority: '',
    severity: '',
    type: '',
    assignedToId: '',
    moduleArea: '',
  });

  const handleBulkUpdate = async () => {
    if (selectedTestCases.length === 0) {
      onError('No test cases selected');
      return;
    }

    // Filter out empty values
    const updates = Object.fromEntries(
      Object.entries(bulkUpdates).filter(([_, value]) => value !== '')
    );

    if (Object.keys(updates).length === 0) {
      onError('No updates specified');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/projects/${projectId}/test-cases/bulk/update`,
        {
          testCaseIds: selectedTestCases,
          updates,
        }
      );

      const { updated, failed, denied } = response.data;
      let message = `Bulk update: ${updated.length} updated`;
      if (failed.length > 0) message += `, ${failed.length} failed`;
      if (denied && denied.length > 0) message += `, ${denied.length} denied (no permission)`;
      
      onSuccess(message);
      setShowBulkUpdateModal(false);
      setBulkUpdates({
        status: '',
        priority: '',
        severity: '',
        type: '',
        assignedToId: '',
        moduleArea: '',
      });
      onClearSelection();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to bulk update test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTestCases.length === 0) {
      onError('No test cases selected');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/projects/${projectId}/test-cases/bulk/delete`,
        {
          testCaseIds: selectedTestCases,
        }
      );

      const { deleted, failed, denied } = response.data;
      let message = `Bulk delete: ${deleted.length} deleted`;
      if (failed.length > 0) message += `, ${failed.length} failed`;
      if (denied && denied.length > 0) message += `, ${denied.length} denied (no permission)`;
      
      onSuccess(message);
      setShowConfirmDeleteModal(false);
      onClearSelection();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to bulk delete test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedTestCases.length === 0) {
      onError('No test cases selected');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/projects/${projectId}/test-cases/bulk/export`,
        {
          testCaseIds: selectedTestCases,
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulk-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      onSuccess(`Exported ${selectedTestCases.length} test cases`);
    } catch (err) {
      onError('Failed to export test cases');
    } finally {
      setLoading(false);
    }
  };

  if (selectedTestCases.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-900">
            {selectedTestCases.length} test case{selectedTestCases.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkUpdateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            <Edit2 className="w-4 h-4" />
            Bulk Update
          </button>
          
          <button
            onClick={handleBulkExport}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Selected
          </button>
          
          <button
            onClick={() => setShowConfirmDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            <Trash2 className="w-4 h-4" />
            Bulk Delete
          </button>
          
          <button
            onClick={onClearSelection}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Bulk Update {selectedTestCases.length} Test Cases
              </h3>
              <button
                onClick={() => setShowBulkUpdateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={bulkUpdates.status}
                  onChange={(e) => setBulkUpdates({ ...bulkUpdates, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- No Change --</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DEPRECATED">Deprecated</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={bulkUpdates.priority}
                  onChange={(e) => setBulkUpdates({ ...bulkUpdates, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- No Change --</option>
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={bulkUpdates.severity}
                  onChange={(e) => setBulkUpdates({ ...bulkUpdates, severity: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- No Change --</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="MAJOR">Major</option>
                  <option value="MINOR">Minor</option>
                  <option value="TRIVIAL">Trivial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={bulkUpdates.type}
                  onChange={(e) => setBulkUpdates({ ...bulkUpdates, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- No Change --</option>
                  <option value="FUNCTIONAL">Functional</option>
                  <option value="REGRESSION">Regression</option>
                  <option value="SMOKE">Smoke</option>
                  <option value="SANITY">Sanity</option>
                  <option value="INTEGRATION">Integration</option>
                  <option value="PERFORMANCE">Performance</option>
                  <option value="SECURITY">Security</option>
                  <option value="USABILITY">Usability</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Module/Area</label>
                <input
                  type="text"
                  value={bulkUpdates.moduleArea}
                  onChange={(e) => setBulkUpdates({ ...bulkUpdates, moduleArea: e.target.value })}
                  placeholder="e.g., Authentication, Checkout"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkUpdate}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Apply Updates'}
              </button>
              <button
                onClick={() => setShowBulkUpdateModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-red-600">
                Confirm Bulk Delete
              </h3>
              <button
                onClick={() => setShowConfirmDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mb-6">
              Are you sure you want to delete {selectedTestCases.length} test case
              {selectedTestCases.length !== 1 ? 's' : ''}? 
              This will soft-delete them and they can be restored later.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete All'}
              </button>
              <button
                onClick={() => setShowConfirmDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
