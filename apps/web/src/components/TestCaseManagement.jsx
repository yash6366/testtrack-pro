import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import axios from 'axios';

/**
 * TestCaseManagement Component
 * Full test case management dashboard for testers
 * Features: Create, Edit, Clone, Import/Export, Assign, Delete with Soft Delete
 */
export default function TestCaseManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    status: '',
    search: '',
  });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [editingTestCase, setEditingTestCase] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'FUNCTIONAL',
    priority: 'P2',
    severity: 'MINOR',
    status: 'DRAFT',
    preconditions: '',
    testData: '',
    environment: '',
    moduleArea: '',
    tags: '',
    steps: [],
    estimatedDurationMinutes: '',
    assignedToId: '',
    ownedById: user?.id || '',
  });

  // Load test cases
  useEffect(() => {
    loadTestCases();
  }, [projectId, filters]);

  const loadTestCases = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/test-cases`,
        {
          params: filters,
        }
      );
      setTestCases(response.data.testCases || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestCase = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const testCaseData = {
        ...formData,
        steps: parseSteps(formData.steps),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        estimatedDurationMinutes: formData.estimatedDurationMinutes 
          ? Number(formData.estimatedDurationMinutes) 
          : null,
      };

      const response = await axios.post(
        `/api/projects/${projectId}/test-cases`,
        testCaseData
      );

      setSuccess('Test case created successfully');
      setShowCreateModal(false);
      resetForm();
      loadTestCases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create test case');
    }
  };

  const handleUpdateTestCase = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const testCaseData = {
        ...formData,
        steps: parseSteps(formData.steps),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        estimatedDurationMinutes: formData.estimatedDurationMinutes 
          ? Number(formData.estimatedDurationMinutes) 
          : null,
      };

      await axios.patch(
        `/api/projects/${projectId}/test-cases/${editingTestCase.id}`,
        testCaseData
      );

      setSuccess('Test case updated successfully');
      setEditingTestCase(null);
      resetForm();
      loadTestCases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update test case');
    }
  };

  const handleDeleteTestCase = async (id) => {
    if (!confirm('Are you sure you want to delete this test case? (It can be restored)')) {
      return;
    }

    try {
      await axios.delete(
        `/api/projects/${projectId}/test-cases/${id}`
      );
      setSuccess('Test case deleted successfully');
      loadTestCases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test case');
    }
  };

  const handleCloneTestCase = async (tc) => {
    const newName = prompt(`Clone test case as:`, `${tc.name} (Clone)`);
    if (!newName) return;

    try {
      await axios.post(
        `/api/projects/${projectId}/test-cases/${tc.id}/clone`,
        { newName }
      );
      setSuccess('Test case cloned successfully');
      loadTestCases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clone test case');
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    const file = e.target.csvFile.files[0];
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvContent = event.target.result;
        const response = await axios.post(
          `/api/tester/projects/${projectId}/test-cases/import`,
          { csvContent }
        );

        setSuccess(
          `Import complete: ${response.data.imported.length} imported, ${response.data.failed.length} failed`
        );
        setShowImportModal(false);
        loadTestCases();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to import test cases');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/test-cases/export/csv`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `testcases-project-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export test cases');
    }
  };

  const parseSteps = (stepsText) => {
    if (!stepsText) return [];
    return stepsText.split('\n\n').filter(step => step.trim()).map(step => {
      const lines = step.trim().split('\n');
      return {
        action: lines[0] || '',
        expectedResult: lines[1] || '',
        notes: lines[2] || '',
      };
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'FUNCTIONAL',
      priority: 'P2',
      severity: 'MINOR',
      status: 'DRAFT',
      preconditions: '',
      testData: '',
      environment: '',
      moduleArea: '',
      tags: '',
      steps: [],
      estimatedDurationMinutes: '',
      assignedToId: '',
      ownedById: user?.id || '',
    });
  };

  const openEditModal = (tc) => {
    setFormData({
      name: tc.name,
      description: tc.description || '',
      type: tc.type,
      priority: tc.priority,
      severity: tc.severity,
      status: tc.status,
      preconditions: tc.preconditions || '',
      testData: tc.testData || '',
      environment: tc.environment || '',
      moduleArea: tc.moduleArea || '',
      tags: tc.tags?.join(', ') || '',
      steps: formatStepsForEdit(tc.steps),
      estimatedDurationMinutes: tc.estimatedDurationMinutes || '',
      assignedToId: tc.assignedToId || '',
      ownedById: tc.ownedById || user?.id,
    });
    setEditingTestCase(tc);
  };

  const formatStepsForEdit = (steps) => {
    if (!steps) return '';
    return steps
      .map(s => `${s.action}\n${s.expectedResult}${s.notes ? '\n' + s.notes : ''}`)
      .join('\n\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Test Case Management</h1>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Back to Project
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                resetForm();
                setEditingTestCase(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Create Test Case
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📥 Import from CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              📤 Export to CSV
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/templates`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              📋 Manage Templates
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError('')} className="float-right">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
            <button onClick={() => setSuccess('')} className="float-right">✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search test cases..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="FUNCTIONAL">Functional</option>
              <option value="REGRESSION">Regression</option>
              <option value="SMOKE">Smoke</option>
              <option value="INTEGRATION">Integration</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>
        </div>

        {/* Test Cases List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading test cases...</div>
          ) : testCases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No test cases found. Create one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Steps</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {testCases.map((tc) => (
                    <tr key={tc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">{tc.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tc.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${
                          tc.priority === 'P0' ? 'bg-red-200 text-red-800' :
                          tc.priority === 'P1' ? 'bg-orange-200 text-orange-800' :
                          tc.priority === 'P2' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {tc.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${
                          tc.status === 'ACTIVE' ? 'bg-blue-200 text-blue-800' :
                          tc.status === 'DRAFT' ? 'bg-gray-200 text-gray-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {tc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tc.steps?.length || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(tc)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCloneTestCase(tc)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Clone
                          </button>
                          <button
                            onClick={() => handleDeleteTestCase(tc.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingTestCase) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-gray-100 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTestCase ? 'Edit Test Case' : 'Create Test Case'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTestCase(null);
                    resetForm();
                  }}
                  className="text-gray-600 hover:text-gray-800 text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={editingTestCase ? handleUpdateTestCase : handleCreateTestCase} className="p-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Test Case Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />

                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    rows="2"
                  />

                  <textarea
                    placeholder="Preconditions"
                    value={formData.preconditions}
                    onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    rows="2"
                  />

                  <textarea
                    placeholder="Test Data (JSON format)"
                    value={formData.testData}
                    onChange={(e) => setFormData({ ...formData, testData: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    rows="2"
                  />

                  <input
                    type="text"
                    placeholder="Environment (e.g., Development, Staging)"
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="REGRESSION">Regression</option>
                      <option value="SMOKE">Smoke</option>
                    </select>

                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Medium</option>
                      <option value="P3">P3 - Low</option>
                    </select>
                  </div>

                  <textarea
                    placeholder="Steps (Each step on new line with action, expected result separated by newline. Steps separated by blank line)"
                    value={formData.steps}
                    onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    rows="4"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium"
                  >
                    {editingTestCase ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingTestCase(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Import Test Cases</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-600 hover:text-gray-800 text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleImportCSV} className="p-6">
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Upload a CSV file with test cases. Headers should include: Name, Description, Type, Priority, Severity, Status, Module, Tags, Preconditions, TestData, Environment
                  </p>

                  <input
                    type="file"
                    name="csvFile"
                    accept=".csv"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium"
                  >
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
