import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';
import DashboardLayout from '../components/DashboardLayout';
import VirtualizedTable from '../components/VirtualizedTable';

export default function ScheduledReportsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [page, setPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'EXECUTION_SUMMARY',
    frequency: 'WEEKLY',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    timezone: 'UTC',
    recipientEmails: '',
    includeMetrics: true,
    includeCharts: true,
    includeFailures: true,
    includeTestCases: false,
  });

  const activeProjectId = projectId || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    loadReports();
  }, [activeProjectId, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');

      if (!activeProjectId) {
        setError('No project selected');
        return;
      }

      const response = await apiClient.get(
        `/api/projects/${activeProjectId}/scheduled-reports?skip=${(page - 1) * 20}&take=20`
      );

      setReports(response.data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Report name is required');
      return;
    }

    if (!formData.recipientEmails.trim()) {
      setError('At least one recipient email is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        ...formData,
        recipientEmails: formData.recipientEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e),
      };

      const response = await apiClient.post(
        `/api/projects/${activeProjectId}/scheduled-reports`,
        payload
      );

      setSuccess('Scheduled report created successfully');
      setFormData({
        name: '',
        description: '',
        type: 'EXECUTION_SUMMARY',
        frequency: 'WEEKLY',
        dayOfWeek: 1,
        dayOfMonth: 1,
        time: '09:00',
        timezone: 'UTC',
        recipientEmails: '',
        includeMetrics: true,
        includeCharts: true,
        includeFailures: true,
        includeTestCases: false,
      });
      setIsCreating(false);
      await loadReports();
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err.message || 'Failed to create scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();

    if (!selectedReport) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        ...selectedReport,
        recipientEmails:
          typeof selectedReport.recipientEmails === 'string'
            ? selectedReport.recipientEmails
              .split(',')
              .map(e => e.trim())
              .filter(e => e)
            : selectedReport.recipientEmails,
      };

      await apiClient.patch(
        `/api/projects/${activeProjectId}/scheduled-reports/${selectedReport.id}`,
        payload
      );

      setSuccess('Scheduled report updated successfully');
      setSelectedReport(null);
      await loadReports();
    } catch (err) {
      console.error('Error updating report:', err);
      setError(err.message || 'Failed to update scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await apiClient.delete(
        `/api/projects/${activeProjectId}/scheduled-reports/${reportId}`
      );

      setSuccess('Scheduled report deleted successfully');
      setSelectedReport(null);
      await loadReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      setError(err.message || 'Failed to delete scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleReportInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSelectedReport(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const reportTypeOptions = [
    { value: 'EXECUTION_SUMMARY', label: 'Execution Summary' },
    { value: 'DEFECT_ANALYSIS', label: 'Defect Analysis' },
    { value: 'MILESTONE_PROGRESS', label: 'Milestone Progress' },
    { value: 'TEAM_PERFORMANCE', label: 'Team Performance' },
    { value: 'REGRESSION_ANALYSIS', label: 'Regression Analysis' },
  ];

  const frequencyOptions = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BIWEEKLY', label: 'Bi-Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
  ];

  const timezones = [
    'UTC',
    'IST',
    'EST',
    'CST',
    'MST',
    'PST',
    'GMT',
    'CET',
    'AEST',
    'JST',
  ];

  if (!activeProjectId) {
    return (
      <DashboardLayout>
        <div className="tt-container">
          <div className="tt-card px-6 py-8 text-center">
            <p className="text-[var(--muted)]">No project selected. Please select a project and try again.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="tt-container">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="tt-heading">Scheduled Reports</h1>
          {!isCreating && !selectedReport && (
            <button
              onClick={() => setIsCreating(true)}
              className="tt-button"
            >
              Create Report
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="tt-alert tt-alert-error mb-4">
            <div className="flex">
              <div className="flex-1">{error}</div>
              <button onClick={() => setError('')} className="text-sm">✕</button>
            </div>
          </div>
        )}
        {success && (
          <div className="tt-alert tt-alert-success mb-4">
            <div className="flex">
              <div className="flex-1">{success}</div>
              <button onClick={() => setSuccess('')} className="text-sm">✕</button>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || selectedReport) && (
          <div className="tt-card mb-6 p-6">
            <h2 className="tt-subsection-heading mb-4">
              {selectedReport ? 'Edit Scheduled Report' : 'Create New Scheduled Report'}
            </h2>

            <form onSubmit={selectedReport ? handleUpdateReport : handleCreateReport} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="tt-label">Report Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={selectedReport ? selectedReport.name : formData.name}
                    onChange={selectedReport ? handleReportInputChange : handleInputChange}
                    className="tt-input"
                    placeholder="e.g., Weekly Execution Summary"
                  />
                </div>

                <div>
                  <label className="tt-label">Report Type</label>
                  <select
                    name="type"
                    value={selectedReport ? selectedReport.type : formData.type}
                    onChange={selectedReport ? handleReportInputChange : handleInputChange}
                    className="tt-input"
                  >
                    {reportTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="tt-label">Description</label>
                <textarea
                  name="description"
                  value={selectedReport ? selectedReport.description : formData.description}
                  onChange={selectedReport ? handleReportInputChange : handleInputChange}
                  className="tt-input"
                  placeholder="Optional description"
                  rows="3"
                />
              </div>

              {/* Schedule Configuration */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Schedule Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="tt-label">Frequency</label>
                    <select
                      name="frequency"
                      value={selectedReport ? selectedReport.frequency : formData.frequency}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-input"
                    >
                      {frequencyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="tt-label">Time (HH:MM)</label>
                    <input
                      type="time"
                      name="time"
                      value={selectedReport ? selectedReport.time : formData.time}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-input"
                    />
                  </div>

                  <div>
                    <label className="tt-label">Timezone</label>
                    <select
                      name="timezone"
                      value={selectedReport ? selectedReport.timezone : formData.timezone}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-input"
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {(selectedReport ? selectedReport.frequency : formData.frequency) === 'WEEKLY' && (
                    <div>
                      <label className="tt-label">Day of Week</label>
                      <select
                        name="dayOfWeek"
                        value={selectedReport ? selectedReport.dayOfWeek : formData.dayOfWeek}
                        onChange={selectedReport ? handleReportInputChange : handleInputChange}
                        className="tt-input"
                      >
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  )}

                  {(selectedReport ? selectedReport.frequency : formData.frequency) === 'MONTHLY' && (
                    <div>
                      <label className="tt-label">Day of Month</label>
                      <input
                        type="number"
                        name="dayOfMonth"
                        min="1"
                        max="31"
                        value={selectedReport ? selectedReport.dayOfMonth : formData.dayOfMonth}
                        onChange={selectedReport ? handleReportInputChange : handleInputChange}
                        className="tt-input"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="tt-label">Recipient Emails *</label>
                <input
                  type="text"
                  name="recipientEmails"
                  value={
                    selectedReport
                      ? Array.isArray(selectedReport.recipientEmails)
                        ? selectedReport.recipientEmails.join(', ')
                        : selectedReport.recipientEmails
                      : formData.recipientEmails
                  }
                  onChange={selectedReport ? handleReportInputChange : handleInputChange}
                  className="tt-input"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-[var(--muted)] mt-1">Separate multiple emails with commas</p>
              </div>

              {/* Report Content Options */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Report Content</h3>

                <div className="space-y-3">
                  <label className="flex items-center tt-label cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeMetrics"
                      checked={selectedReport ? selectedReport.includeMetrics : formData.includeMetrics}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-checkbox"
                    />
                    <span className="ml-2">Include Metrics</span>
                  </label>

                  <label className="flex items-center tt-label cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeCharts"
                      checked={selectedReport ? selectedReport.includeCharts : formData.includeCharts}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-checkbox"
                    />
                    <span className="ml-2">Include Charts</span>
                  </label>

                  <label className="flex items-center tt-label cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeFailures"
                      checked={selectedReport ? selectedReport.includeFailures : formData.includeFailures}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-checkbox"
                    />
                    <span className="ml-2">Include Failures</span>
                  </label>

                  <label className="flex items-center tt-label cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeTestCases"
                      checked={selectedReport ? selectedReport.includeTestCases : formData.includeTestCases}
                      onChange={selectedReport ? handleReportInputChange : handleInputChange}
                      className="tt-checkbox"
                    />
                    <span className="ml-2">Include Test Cases</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="tt-button"
                >
                  {loading ? 'Saving...' : selectedReport ? 'Update Report' : 'Create Report'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedReport(null);
                  }}
                  className="tt-button tt-button-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reports List */}
        {!isCreating && !selectedReport && (
          <div className="tt-card">
            {loading ? (
              <div className="p-6 text-center text-[var(--muted)]">Loading scheduled reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-6 text-center text-[var(--muted)]">
                No scheduled reports yet. Create one to get started!
              </div>
            ) : (
              <VirtualizedTable
                columns={[
                  { label: 'Name', key: 'name', width: 200 },
                  {
                    label: 'Type',
                    key: 'type',
                    width: 180,
                    render: (value) => (
                      <span className="inline-block px-2 py-1 bg-[var(--surface)] text-xs rounded">
                        {value.replace(/_/g, ' ')}
                      </span>
                    ),
                  },
                  { label: 'Frequency', key: 'frequency', width: 120 },
                  {
                    label: 'Recipients',
                    key: 'recipientEmails',
                    width: 140,
                    render: (value) => (
                      <span className="text-xs text-[var(--muted)]">
                        {Array.isArray(value) ? value.length : 0} recipient(s)
                      </span>
                    ),
                  },
                  {
                    label: 'Last Generated',
                    key: 'lastGeneratedAt',
                    width: 150,
                    render: (value) => (
                      <span className="text-xs text-[var(--muted)]">
                        {value ? new Date(value).toLocaleDateString() : 'Never'}
                      </span>
                    ),
                  },
                  {
                    label: 'Status',
                    key: 'isActive',
                    width: 100,
                    render: (value) => (
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {value ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                  {
                    label: 'Actions',
                    key: 'id',
                    width: 150,
                    render: (value, row) => (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(row);
                          }}
                          className="text-xs tt-button tt-button-secondary px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(row.id);
                          }}
                          className="text-xs tt-button tt-button-danger px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={reports}
                itemSize={55}
                height={500}
                emptyMessage="No scheduled reports yet"
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
