import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';
import { logError } from '../lib/errorLogger';

export default function WebhooksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [],
    secret: '',
    description: '',
    isActive: true,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  const availableEvents = [
    'TEST_CREATED',
    'TEST_UPDATED',
    'TEST_DELETED',
    'BUG_CREATED',
    'BUG_UPDATED',
    'BUG_STATUS_CHANGED',
    'BUG_ASSIGNED',
    'EXECUTION_COMPLETED',
    'EXECUTION_FAILED',
    'SUITE_COMPLETED',
    'SUITE_FAILED',
  ];

  useEffect(() => {
    if (projectId) {
      loadWebhooks();
    }
  }, [projectId]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/projects/${projectId}/webhooks`);
      setWebhooks(response.webhooks || response || []);
    } catch (err) {
      setError(err.message || 'Failed to load webhooks');
      logError(err, 'WebhooksPage.loadWebhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (webhookId) => {
    try {
      setActionLoading(true);
      const response = await apiClient.get(
        `/api/projects/${projectId}/webhooks/${webhookId}/deliveries`
      );
      setDeliveries(response.deliveries || response.data || []);
      setShowDeliveriesModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load webhook deliveries');
      logError(err, 'WebhooksPage.loadDeliveries');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEventToggle = (event) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url || formData.events.length === 0) {
      setError('Please fill in all required fields and select at least one event');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.post(`/api/projects/${projectId}/webhooks`, formData);
      setSuccessMessage('Webhook created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        url: '',
        events: [],
        secret: '',
        description: '',
        isActive: true,
      });
      await loadWebhooks();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create webhook');
      logError(err, 'WebhooksPage.createWebhook');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWebhook = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.patch(
        `/api/projects/${projectId}/webhooks/${selectedWebhook.id}`,
        formData
      );
      setSuccessMessage('Webhook updated successfully');
      setShowEditModal(false);
      setSelectedWebhook(null);
      await loadWebhooks();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update webhook');
      logError(err, 'WebhooksPage.updateWebhook');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name || '',
      url: webhook.url || '',
      events: webhook.events || [],
      secret: webhook.secret || '',
      description: webhook.description || '',
      isActive: webhook.isActive !== undefined ? webhook.isActive : true,
    });
    setShowEditModal(true);
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(`/api/projects/${projectId}/webhooks/${webhookId}`);
      setSuccessMessage('Webhook deleted successfully');
      await loadWebhooks();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete webhook');
      logError(err, 'WebhooksPage.deleteWebhook');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      setActionLoading(true);
      setError('');
      await apiClient.post(`/api/projects/${projectId}/webhooks/${webhookId}/test`);
      setSuccessMessage('Test webhook sent successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send test webhook');
      logError(err, 'WebhooksPage.testWebhook');
    } finally {
      setActionLoading(false);
    }
  };

  if (!projectId) {
    return (
      <DashboardLayout user={user} dashboardLabel="Webhooks" headerTitle="Webhooks">
        <div className="p-6 text-center">
          <p className="text-[var(--muted)]">Please select a project to manage webhooks</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout user={user} dashboardLabel="Webhooks" headerTitle="Webhooks">
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Webhooks"
      headerTitle="Webhooks"
      headerSubtitle="Manage webhook integrations for your project"
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

        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Project Webhooks</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Configure webhooks to receive real-time notifications about project events
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="tt-btn tt-btn-primary px-4 py-2 text-sm"
          >
            + Create Webhook
          </button>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <div className="tt-card p-8 text-center">
            <p className="text-[var(--muted)] mb-4">No webhooks configured yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="tt-btn tt-btn-primary px-6 py-2 text-sm"
            >
              Create Your First Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="tt-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">
                        {webhook.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          webhook.isActive
                            ? 'bg-green-500/10 text-green-600 dark:text-green-300'
                            : 'bg-gray-500/10 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-2">{webhook.description}</p>
                    <p className="text-xs text-[var(--muted)] font-mono break-all">
                      {webhook.url}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadDeliveries(webhook.id)}
                      disabled={actionLoading}
                      className="tt-btn tt-btn-outline px-3 py-1.5 text-xs"
                    >
                      Deliveries
                    </button>
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={actionLoading}
                      className="tt-btn tt-btn-outline px-3 py-1.5 text-xs"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleEditClick(webhook)}
                      className="tt-btn tt-btn-outline px-3 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      disabled={actionLoading}
                      className="tt-btn tt-btn-outline px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Events */}
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs text-[var(--muted)] mb-2">Subscribed Events:</p>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events && webhook.events.length > 0 ? (
                      webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs rounded"
                        >
                          {event}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--muted)]">No events configured</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
                Create Webhook
              </h2>

              <form onSubmit={handleCreateWebhook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="My Webhook"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payload URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/webhook"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="What does this webhook do?"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secret (Optional)
                  </label>
                  <input
                    type="password"
                    name="secret"
                    value={formData.secret}
                    onChange={handleInputChange}
                    placeholder="Webhook secret for verification"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Used to verify webhook signatures
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Events <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-[var(--border)] rounded p-3 max-h-48 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event)}
                          onChange={() => handleEventToggle(event)}
                          className="rounded"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Select at least one event to subscribe to
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <label className="text-sm">Active</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="tt-btn tt-btn-primary px-4 py-2 text-sm flex-1"
                  >
                    {actionLoading ? 'Creating...' : 'Create Webhook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        name: '',
                        url: '',
                        events: [],
                        secret: '',
                        description: '',
                        isActive: true,
                      });
                    }}
                    className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Edit Webhook</h2>

              <form onSubmit={handleUpdateWebhook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payload URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Events</label>
                  <div className="border border-[var(--border)] rounded p-3 max-h-48 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event)}
                          onChange={() => handleEventToggle(event)}
                          className="rounded"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <label className="text-sm">Active</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="tt-btn tt-btn-primary px-4 py-2 text-sm flex-1"
                  >
                    {actionLoading ? 'Updating...' : 'Update Webhook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedWebhook(null);
                    }}
                    className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
      {showDeliveriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Webhook Deliveries
                </h2>
                <button
                  onClick={() => {
                    setShowDeliveriesModal(false);
                    setDeliveries([]);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              </div>

              {deliveries.length === 0 ? (
                <p className="text-center text-[var(--muted)] py-8">No deliveries yet</p>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="border border-[var(--border)] rounded p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              delivery.success
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {delivery.success ? 'Success' : 'Failed'}
                          </span>
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            Status: {delivery.responseStatus || 'N/A'}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">
                          {new Date(delivery.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--muted)] font-mono">
                        Event: {delivery.event}
                      </p>
                      {delivery.error && (
                        <p className="text-xs text-red-600 mt-2">Error: {delivery.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
