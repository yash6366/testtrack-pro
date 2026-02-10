import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileTemplate, Plus, Edit2, Trash2, Copy, X } from 'lucide-react';

/**
 * TestCaseTemplateSelector Component
 * Allows users to browse, create, and use test case templates
 */
export default function TestCaseTemplateSelector({ 
  projectId, 
  onSelectTemplate,
  onClose 
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [testCaseName, setTestCaseName] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/projects/${projectId}/templates`);
      setTemplates(response.data.templates || []);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async (template) => {
    if (!testCaseName) {
      setError('Please enter a test case name');
      return;
    }

    try {
      const response = await axios.post(
        `/api/templates/${template.id}/create-test-case`,
        {
          projectId: Number(projectId),
          testCaseName,
        }
      );

      onSelectTemplate(response.data);
      setSelectedTemplate(null);
      setTestCaseName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create test case from template');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileTemplate className="w-6 h-6" />
              Test Case Templates
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileTemplate className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No templates available yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create First Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {template.category && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mt-1">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">{template.type}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{template.priority}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{template.severity}</span>
                  </div>

                  {template.templateSteps && template.templateSteps.length > 0 && (
                    <div className="text-sm text-gray-600 mb-3">
                      {template.templateSteps.length} pre-defined step(s)
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setTestCaseName('');
                      setError('');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    <Copy className="w-4 h-4" />
                    Use This Template
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create from template modal */}
          {selectedTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">
                  Create Test Case from Template
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Template: <strong>{selectedTemplate.name}</strong>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Test Case Name *
                  </label>
                  <input
                    type="text"
                    value={testCaseName}
                    onChange={(e) => setTestCaseName(e.target.value)}
                    placeholder="Enter test case name"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p>This will create a new test case with:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Type: {selectedTemplate.type}</li>
                    <li>Priority: {selectedTemplate.priority}</li>
                    <li>Severity: {selectedTemplate.severity}</li>
                    {selectedTemplate.templateSteps && (
                      <li>{selectedTemplate.templateSteps.length} pre-filled steps</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateFromTemplate(selectedTemplate)}
                    disabled={!testCaseName}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Create Test Case
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTestCaseName('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
