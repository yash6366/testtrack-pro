import { useState } from 'react';
import axios from 'axios';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * TestCaseImportModal Component
 * Handles CSV/Excel import of test cases with validation and results display
 */
export default function TestCaseImportModal({ projectId, isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setError('');
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target.result;
        
        const response = await axios.post(
          `/api/projects/${projectId}/test-cases/import/csv`,
          { csvContent }
        );

        setImportResults(response.data);
        
        if (response.data.imported.length > 0) {
          onSuccess(
            `Successfully imported ${response.data.imported.length} test case(s). ` +
            `${response.data.failed.length} failed.`
          );
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to import test cases');
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setImporting(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResults(null);
    setError('');
    onClose();
  };

  const downloadTemplate = () => {
    const template = `ID,Name,Description,Type,Priority,Severity,Status,Module/Area,Tags,Preconditions,Test Data,Environment
,Login Test,Verify user can login,FUNCTIONAL,P1,MAJOR,ACTIVE,Authentication,login;auth,User must have account,username: testuser,Development
,Logout Test,Verify user can logout,FUNCTIONAL,P2,MINOR,ACTIVE,Authentication,logout;auth,User must be logged in,,Development`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'test-case-import-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Import Test Cases from CSV</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              CSV Format Instructions
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>First row must be headers (ID, Name, Description, Type, Priority, etc.)</li>
              <li>ID column can be left empty (system will auto-generate)</li>
              <li>Name is required for each test case</li>
              <li>Tags should be separated by semicolons (;)</li>
              <li>Valid Types: FUNCTIONAL, REGRESSION, SMOKE, SANITY, INTEGRATION, PERFORMANCE, SECURITY, USABILITY</li>
              <li>Valid Priorities: P0, P1, P2, P3</li>
              <li>Valid Severities: CRITICAL, MAJOR, MINOR, TRIVIAL</li>
              <li>Valid Status: DRAFT, ACTIVE, DEPRECATED, ARCHIVED</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select CSV File</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1 px-3 py-2 border rounded"
              />
              {selectedFile && (
                <span className="text-sm text-gray-600">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="mb-6 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">
                    Successfully Imported: {importResults.imported.length}
                  </h4>
                </div>
                {importResults.imported.length > 0 && (
                  <ul className="text-sm text-gray-700 max-h-40 overflow-y-auto">
                    {importResults.imported.map((item, idx) => (
                      <li key={idx} className="ml-4">
                        ✓ {item.name} (ID: {item.id})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {importResults.failed.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">
                      Failed: {importResults.failed.length}
                    </h4>
                  </div>
                  <ul className="text-sm text-red-700 max-h-40 overflow-y-auto">
                    {importResults.failed.map((item, idx) => (
                      <li key={idx} className="ml-4">
                        Row {item.row}: {item.name || 'Unknown'} - {item.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Total processed: {importResults.total}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import Test Cases'}
            </button>
            
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              {importResults ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
