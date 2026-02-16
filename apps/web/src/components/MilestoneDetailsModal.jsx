/**
 * MILESTONE DETAILS MODAL
 * View and edit milestone details with tabs for test cases and defects
 */

import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, ChevronDown, Plus } from 'lucide-react';
import Button from './common/Button';

export default function MilestoneDetailsModal({
  milestone,
  onClose,
  onUpdate,
  onAssignTestCases,
  onAssignDefects,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    name: milestone.name,
    description: milestone.description,
    status: milestone.status,
    targetStartDate: milestone.targetStartDate,
    targetEndDate: milestone.targetEndDate,
    priority: milestone.priority,
    notes: milestone.notes,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle save
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onUpdate(milestone.id, formData);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      PLANNED: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.PLANNED;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{milestone.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-100 text-green-700 rounded">
            Milestone updated successfully
          </div>
        )}

        {/* Tabs */}
        <div className="border-b flex">
          {['details', 'testcases', 'defects'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'testcases'
                ? `Test Cases (${milestone.testCases?.length || 0})`
                : tab === 'defects'
                ? `Defects (${milestone.defects?.length || 0})`
                : 'Details'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Edit2 size={18} />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      onClick={() => {
                        setFormData({
                          name: milestone.name,
                          description: milestone.description,
                          status: milestone.status,
                          targetStartDate: milestone.targetStartDate,
                          targetEndDate: milestone.targetEndDate,
                          priority: milestone.priority,
                          notes: milestone.notes,
                        });
                        setIsEditing(false);
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                )}
              </div>

              {/* Progress */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-blue-600">
                    {milestone.completionPercent || 0}%
                  </p>
                  <p className="text-gray-600 mt-2">Overall Completion</p>
                </div>

                {milestone.progress && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded">
                      <p className="text-gray-600 text-sm">Test Cases</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {milestone.progress.completedTestCases}/
                        {milestone.progress.totalTestCases}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${milestone.progress.testCases || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded">
                      <p className="text-gray-600 text-sm">Defects</p>
                      <p className="text-2xl font-bold text-green-600">
                        {milestone.progress.resolvedDefects}/
                        {milestone.progress.totalDefects}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${milestone.progress.defects || 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              {!isEditing ? (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        milestone.status
                      )}`}
                    >
                      {milestone.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority
                    </label>
                    <p className="text-gray-900">{milestone.priority}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <p className="text-gray-900">
                      {formatDate(milestone.targetStartDate)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <p className="text-gray-900">
                      {formatDate(milestone.targetEndDate)}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <p className="text-gray-900">
                      {milestone.description || 'No description'}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes
                    </label>
                    <p className="text-gray-900">{milestone.notes || 'No notes'}</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Created By
                    </label>
                    <p className="text-gray-900">
                      {milestone.creator?.name} ({milestone.creator?.email})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="targetStartDate"
                        value={formData.targetStartDate?.split('T')[0] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="targetEndDate"
                        value={formData.targetEndDate?.split('T')[0] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Cases Tab */}
          {activeTab === 'testcases' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    // TODO: Implement test case assignment modal
                  }}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Test Cases
                </Button>
              </div>

              {milestone.testCases && milestone.testCases.length > 0 ? (
                <div className="space-y-2">
                  {milestone.testCases.map(tc => (
                    <div
                      key={tc.id}
                      className="p-4 border rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{tc.name}</p>
                        <p className={`text-xs font-medium mt-1 ${
                          tc.status === 'ACTIVE'
                            ? 'text-green-700'
                            : 'text-gray-600'
                        }`}>
                          {tc.status}
                        </p>
                      </div>
                      <button className="text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No test cases assigned yet
                </div>
              )}
            </div>
          )}

          {/* Defects Tab */}
          {activeTab === 'defects' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    // TODO: Implement defect assignment modal
                  }}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Defects
                </Button>
              </div>

              {milestone.defects && milestone.defects.length > 0 ? (
                <div className="space-y-2">
                  {milestone.defects.map(defect => (
                    <div
                      key={defect.id}
                      className="p-4 border rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{defect.title}</p>
                        <p className={`text-xs font-medium mt-1 ${
                          defect.status === 'VERIFIED_FIXED'
                            ? 'text-green-700'
                            : defect.status === 'NEW'
                            ? 'text-red-700'
                            : 'text-gray-600'
                        }`}>
                          {defect.status.replace('_', ' ')}
                        </p>
                      </div>
                      <button className="text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No defects assigned yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
