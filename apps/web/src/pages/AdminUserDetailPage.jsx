import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/admin/users/${userId}`);
      setUser(response);
      setFormData({
        name: response.name || '',
        email: response.email || '',
        role: response.role || 'TESTER',
      });
    } catch (err) {
      setError(err.message || 'Failed to load user details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setActionLoading(true);
      setSuccessMessage('');
      await apiClient.patch(`/api/admin/users/${userId}`, formData);
      setSuccessMessage('User updated successfully');
      setIsEditing(false);
      await loadUserDetails();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.patch(`/api/admin/users/${userId}/deactivate`, {});
      setSuccessMessage('User deactivated successfully');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateUser = async () => {
    try {
      setActionLoading(true);
      setError('');
      await apiClient.patch(`/api/admin/users/${userId}/reactivate`, {});
      setSuccessMessage('User reactivated successfully');
      await loadUserDetails();
    } catch (err) {
      setError(err.message || 'Failed to reactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        user={currentUser}
        dashboardLabel="Admin Dashboard"
        headerTitle="User Details"
      >
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !user) {
    return (
      <DashboardLayout
        user={currentUser}
        dashboardLabel="Admin Dashboard"
        headerTitle="User Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back
          </button>
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout
        user={currentUser}
        dashboardLabel="Admin Dashboard"
        headerTitle="User Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back
          </button>
          <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded">
            User not found
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={currentUser}
      dashboardLabel="Admin Dashboard"
      headerTitle={user.name}
      headerSubtitle={user.email}
    >
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          ← Back to Dashboard
        </button>

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

        {/* User Details Card */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-xl font-bold">User Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="tt-btn tt-btn-primary px-4 py-2 text-sm"
              >
                Edit
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {isEditing ? (
              // Edit Form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="TESTER">Tester</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveChanges}
                    disabled={actionLoading}
                    className="tt-btn tt-btn-primary px-4 py-2 text-sm"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        role: user.role || 'TESTER',
                      });
                    }}
                    disabled={actionLoading}
                    className="tt-btn tt-btn-outline px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display View
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[var(--muted)]">Name</label>
                    <p className="text-lg font-medium mt-1">{user.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--muted)]">Email</label>
                    <p className="text-lg font-medium mt-1">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--muted)]">Role</label>
                    <p className="text-lg font-medium mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300' :
                        user.role === 'DEVELOPER' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      }`}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--muted)]">Status</label>
                    <p className="text-lg font-medium mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-green-500/10 text-green-600 dark:text-green-300' :
                        'bg-gray-500/10 text-gray-600 dark:text-gray-300'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  {user.createdAt && (
                    <div>
                      <label className="text-sm text-[var(--muted)]">Created</label>
                      <p className="text-lg font-medium mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  {user.lastLogin && (
                    <div>
                      <label className="text-sm text-[var(--muted)]">Last Login</label>
                      <p className="text-lg font-medium mt-1">{new Date(user.lastLogin).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Card */}
        {!isEditing && (
          <div className="tt-card">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold">Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              {user.isActive ? (
                <button
                  onClick={handleDeactivateUser}
                  disabled={actionLoading}
                  className="w-full tt-btn tt-btn-danger py-2 text-sm"
                >
                  {actionLoading ? 'Processing...' : 'Deactivate User'}
                </button>
              ) : (
                <button
                  onClick={handleReactivateUser}
                  disabled={actionLoading}
                  className="w-full tt-btn tt-btn-primary py-2 text-sm"
                >
                  {actionLoading ? 'Processing...' : 'Reactivate User'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
