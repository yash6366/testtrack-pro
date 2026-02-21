/**
 * MILESTONES PAGE
 * List and manage project milestones with progress tracking
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  Search,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { useMilestones } from '../hooks/useMilestones';
import MilestoneDetailsModal from '../components/MilestoneDetailsModal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import BackButton from '@/components/ui/BackButton';

export default function MilestonesPage() {
  const { projectId } = useParams();
  const {
    milestones,
    loading,
    error,
    filters,
    pagination,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    assignTestCases,
    assignDefects,
    getMilestoneProgress,
    handleFilterChange,
    handlePageChange,
  } = useMilestones(projectId);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'text-gray-500',
      MEDIUM: 'text-blue-500',
      HIGH: 'text-orange-500',
      CRITICAL: 'text-red-500',
    };
    return colors[priority] || colors.MEDIUM;
  };

  // Check if milestone is overdue
  const isOverdue = (milestone) => {
    if (!milestone.targetEndDate || milestone.status === 'COMPLETED') {
      return false;
    }
    return new Date(milestone.targetEndDate) < new Date();
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

  // Handle milestone selection
  const handleSelectMilestone = (milestone) => {
    setSelectedMilestone(milestone);
    setShowDetailsModal(true);
  };

  // Handle create milestone
  const handleCreateMilestone = async (data) => {
    try {
      await createMilestone(data);
      setShowCreateForm(false);
    } catch (err) {
      alert('Error creating milestone: ' + err);
    }
  };

  // Handle delete milestone
  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await deleteMilestone(milestoneId);
      setDeleteConfirm(null);
    } catch (err) {
      alert('Error deleting milestone: ' + err);
    }
  };

  // Handle filter change
  const handleStatusFilterChange = (status) => {
    handleFilterChange({
      status: filters.status === status ? null : status,
    });
  };

  const handlePriorityFilterChange = (priority) => {
    handleFilterChange({
      priority: filters.priority === priority ? null : priority,
    });
  };

  const handleSearch = (e) => {
    handleFilterChange({ search: e.target.value });
  };

  if (error) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">
        <p>Error loading milestones: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton label="Back to Dashboard" fallback="/dashboard" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Milestones</h1>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
          variant="primary"
        >
          <Plus size={20} />
          New Milestone
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <Input
            type="text"
            placeholder="Search milestones..."
            value={filters.search || ''}
            onChange={handleSearch}
            className="flex-1"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Filter size={20} className="text-gray-400 self-center" />
          
          {/* Status filters */}
          <div className="flex gap-2">
            {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filters.status === status
                    ? getStatusColor(status)
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Priority filters */}
          <div className="flex gap-2 ml-auto">
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(priority => (
              <button
                key={priority}
                onClick={() => handlePriorityFilterChange(priority)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filters.priority === priority
                    ? `${getPriorityColor(priority)} bg-gray-100`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading milestones...</div>
          </div>
        ) : milestones.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-gray-500">No milestones found</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="secondary"
              className="mt-4"
            >
              Create First Milestone
            </Button>
          </div>
        ) : (
          milestones.map(milestone => (
            <div
              key={milestone.id}
              className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 ${
                isOverdue(milestone) ? 'border-red-500' : 'border-gray-200'
              } cursor-pointer`}
              onClick={() => handleSelectMilestone(milestone)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {milestone.name}
                  </h3>
                  {milestone.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {milestone.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMilestone(milestone);
                      setShowDetailsModal(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(milestone.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Status and Priority */}
              <div className="flex gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    milestone.status
                  )}`}
                >
                  {milestone.status.replace('_', ' ')}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 ${getPriorityColor(
                    milestone.priority
                  )}`}
                >
                  {milestone.priority}
                </span>
                {isOverdue(milestone) && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {milestone.completionPercent || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${milestone.completionPercent || 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Dates and Counts */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 flex items-center gap-1">
                    <Calendar size={16} />
                    Due: {formatDate(milestone.targetEndDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-700 flex items-center gap-1 justify-end">
                    <TrendingUp size={16} />
                    {milestone.testCases?.length || 0} Test Cases,{' '}
                    {milestone.defects?.length || 0} Defects
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.take && (
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
          <span className="text-gray-600 text-sm">
            Showing {pagination.skip + 1} to{' '}
            {Math.min(pagination.skip + pagination.take, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                handlePageChange(
                  Math.max(0, pagination.skip - pagination.take),
                  pagination.take
                )
              }
              disabled={pagination.skip === 0}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                handlePageChange(
                  pagination.skip + pagination.take,
                  pagination.take
                )
              }
              disabled={pagination.skip + pagination.take >= pagination.total}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Delete Milestone?
            </h2>
            <p className="text-gray-600 mb-6">
              This will unassign all test cases and defects from this milestone.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setDeleteConfirm(null)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteMilestone(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <CreateMilestoneModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateMilestone}
        />
      )}

      {showDetailsModal && selectedMilestone && (
        <MilestoneDetailsModal
          milestone={selectedMilestone}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={updateMilestone}
          onAssignTestCases={assignTestCases}
          onAssignDefects={assignDefects}
        />
      )}
    </div>
  );
}

// Create Milestone Modal Component
function CreateMilestoneModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetStartDate: '',
    targetEndDate: '',
    priority: 'MEDIUM',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Create New Milestone
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Milestone Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="targetStartDate"
              type="date"
              value={formData.targetStartDate}
              onChange={handleChange}
            />
            <Input
              label="End Date"
              name="targetEndDate"
              type="date"
              value={formData.targetEndDate}
              onChange={handleChange}
            />
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

          <div className="flex gap-3 justify-end pt-4">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? 'Creating...' : 'Create Milestone'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
