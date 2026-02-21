import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import { apiClient } from '@/lib/apiClient';
import { Edit2, Save, X } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    location: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await apiClient.get('/api/user/profile');
        setProfileData({
          name: response.user?.name || user?.name || '',
          email: response.user?.email || user?.email || '',
          bio: response.user?.bio || '',
          location: response.user?.location || '',
          timezone: response.user?.timezone || 'UTC',
        });
      } catch {
        // Use default values from user context
      }
    };

    loadProfile();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.patch('/api/user/profile', {
        name: profileData.name,
        bio: profileData.bio,
        location: profileData.location,
        timezone: profileData.timezone,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      bio: '',
      location: '',
      timezone: 'UTC',
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-300';
      case 'DEVELOPER':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300';
      case 'TESTER':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Profile"
      headerTitle="My Profile"
      headerSubtitle="View and manage your profile information"
      onLogout={handleLogout}
    >
      <div className="mb-4">
        <BackButton label="Back to Dashboard" fallback="/dashboard" />
      </div>

      {message.text && (
        <div
          className={`tt-card p-4 mb-6 ${
            message.type === 'success'
              ? 'border-[var(--success)] text-[var(--success)]'
              : 'border-[var(--danger)] text-[var(--danger)]'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="tt-card p-6">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold mb-4">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              {/* Name and Role */}
              <h2 className="text-2xl font-bold mb-2">{user?.name}</h2>
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold mb-4 ${getRoleBadgeColor(
                  user?.role,
                )}`}
              >
                {user?.role || 'User'}
              </span>

              {/* Stats */}
              <div className="w-full mt-6 pt-6 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Member Since</span>
                  <span className="font-medium">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Status</span>
                  <span className="text-[var(--success)] font-medium">Active</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-6 space-y-3">
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full tt-btn-secondary"
                >
                  Account Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="tt-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 tt-btn-secondary"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="h-4 w-4 text-[var(--muted)]" />
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Enter your name"
                  />
                ) : (
                  <p className="text-[var(--foreground)]">{profileData.name || 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Mail className="h-4 w-4 text-[var(--muted)]" />
                  Email Address
                </label>
                <p className="text-[var(--muted)] text-sm">
                  {profileData.email}
                  <span className="ml-2 text-xs">(Cannot be changed)</span>
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="h-4 w-4 text-[var(--muted)]" />
                  Bio
                </label>
                {editing ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    rows="4"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-[var(--foreground)]">
                    {profileData.bio || 'No bio provided'}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar className="h-4 w-4 text-[var(--muted)]" />
                  Location
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) =>
                      setProfileData({ ...profileData, location: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="City, Country"
                  />
                ) : (
                  <p className="text-[var(--foreground)]">
                    {profileData.location || 'Not set'}
                  </p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar className="h-4 w-4 text-[var(--muted)]" />
                  Timezone
                </label>
                {editing ? (
                  <select
                    value={profileData.timezone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, timezone: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New York</option>
                    <option value="America/Los_Angeles">America/Los Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                  </select>
                ) : (
                  <p className="text-[var(--foreground)]">{profileData.timezone}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Shield className="h-4 w-4 text-[var(--muted)]" />
                  Role
                </label>
                <p className="text-[var(--muted)] text-sm">
                  {user?.role || 'User'}
                  <span className="ml-2 text-xs">(Managed by administrators)</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 tt-btn-secondary"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 tt-btn-primary"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
