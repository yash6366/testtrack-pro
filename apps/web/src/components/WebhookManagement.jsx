import { useState, useEffect } from 'react';
import axios from 'axios';

const WebhookManagement = ({ project }) => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);

  useEffect(() => {
    if (project) {
      fetchWebhooks();
    }
  }, [project]);

  const fetchWebhooks = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setWebhooks(response.data.webhooks || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks/${webhookId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete webhook');
    }
  };

  const handleToggleActive = async (webhookId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks/${webhookId}`,
        { isActive: !isActive },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update webhook');
    }
  };

  const handleTest = async (webhookId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks/${webhookId}/test`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert('Test webhook sent successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send test webhook');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure webhooks to receive real-time notifications about events
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Create Webhook
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-gray-600 mb-4">No webhooks configured yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {webhook.autoDisabledAt && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                        Auto-Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{webhook.url}</p>
                  {webhook.description && (
                    <p className="text-sm text-gray-500 mb-3">{webhook.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                      >
                        {event.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Failure Count:</span>{' '}
                      <span className={webhook.failureCount > 0 ? 'text-red-600' : ''}>
                        {webhook.failureCount}
                      </span>
                    </div>
                    {webhook.lastSuccessAt && (
                      <div>
                        <span className="font-medium">Last Success:</span>{' '}
                        {new Date(webhook.lastSuccessAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedWebhook(webhook);
                      setShowDeliveriesModal(true);
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    title="View Deliveries"
                  >
                    Deliveries
                  </button>
                  <button
                    onClick={() => handleTest(webhook.id)}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    title="Send Test"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleToggleActive(webhook.id, webhook.isActive)}
                    className={`px-3 py-1.5 text-sm border rounded ${
                      webhook.isActive
                        ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {webhook.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWebhookModal
          project={project}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchWebhooks();
          }}
        />
      )}

      {showDeliveriesModal && selectedWebhook && (
        <DeliveriesModal
          webhook={selectedWebhook}
          project={project}
          onClose={() => {
            setShowDeliveriesModal(false);
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
};

// CreateWebhookModal Component
function CreateWebhookModal({ project, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [],
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (event) => {
    setFormData({
      ...formData,
      events: formData.events.includes(event)
        ? formData.events.filter((e) => e !== event)
        : [...formData.events, event],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Create Webhook</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="My Webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events * (select at least 1)</label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{event.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.events.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// DeliveriesModal Component
function DeliveriesModal({ webhook, project, onClose }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects/${project.id}/webhooks/${webhook.id}/deliveries`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setDeliveries(response.data.deliveries || []);
    } catch (_err) {
      // Failed to fetch deliveries
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETRYING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Webhook Deliveries</h2>
            <p className="text-sm text-gray-600 mt-1">{webhook.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(delivery.status)}`}>
                      {delivery.status}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{delivery.event.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(delivery.createdAt).toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {delivery.responseCode && (
                    <div>
                      <span className="text-gray-600">Response Code:</span>
                      <span className="ml-2 font-medium">{delivery.responseCode}</span>
                    </div>
                  )}
                  {delivery.durationMs && (
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium">{delivery.durationMs}ms</span>
                    </div>
                  )}
                  {delivery.attemptCount > 0 && (
                    <div>
                      <span className="text-gray-600">Attempts:</span>
                      <span className="ml-2 font-medium">{delivery.attemptCount}</span>
                    </div>
                  )}
                </div>
                {delivery.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                    {delivery.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookManagement;
