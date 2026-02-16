import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';

/**
 * NotificationPreferences Component
 * Allows users to configure notification settings
 */
export default function NotificationPreferences() {
  const { user, token } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        '/api/notifications/preferences',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrefs(response.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPrefs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch(
        '/api/notifications/preferences',
        prefs,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--muted)]">Loading preferences...</p>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="tt-card p-6 text-center">
        <p className="text-[var(--muted)]">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Success/Error Messages */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications Section */}
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📧 Email Notifications
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded">
              <input
                type="checkbox"
                name="emailEnabled"
                checked={prefs.emailEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="flex-1">
                <span className="font-medium text-[var(--text)]">Enable email notifications</span>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Receive email notifications for important events
                </p>
              </span>
            </label>

            {prefs.emailEnabled && (
              <div className="ps-9 space-y-2 pt-2 border-l-2 border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailBugCreated"
                    checked={prefs.emailBugCreated}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  New bugs created
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailBugAssigned"
                    checked={prefs.emailBugAssigned}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Bugs assigned to me
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailBugCommented"
                    checked={prefs.emailBugCommented}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Comments on my bugs
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailBugStatusChanged"
                    checked={prefs.emailBugStatusChanged}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Bug status changes
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailTestFailed"
                    checked={prefs.emailTestFailed}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Test execution failures
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailMentioned"
                    checked={prefs.emailMentioned}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  When I'm mentioned
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="emailAnnouncements"
                    checked={prefs.emailAnnouncements}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  System announcements
                </label>
              </div>
            )}
          </div>
        </div>

        {/* In-App Notifications Section */}
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🔔 In-App Notifications
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded">
              <input
                type="checkbox"
                name="inAppEnabled"
                checked={prefs.inAppEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="flex-1">
                <span className="font-medium text-[var(--text)]">Enable in-app notifications</span>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Receive notifications within the application
                </p>
              </span>
            </label>

            {prefs.inAppEnabled && (
              <div className="ps-9 space-y-2 pt-2 border-l-2 border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppBugCreated"
                    checked={prefs.inAppBugCreated}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  New bugs created
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppBugAssigned"
                    checked={prefs.inAppBugAssigned}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Bugs assigned to me
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppBugCommented"
                    checked={prefs.inAppBugCommented}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Comments on my bugs
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppBugStatusChanged"
                    checked={prefs.inAppBugStatusChanged}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Bug status changes
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppTestFailed"
                    checked={prefs.inAppTestFailed}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  Test execution failures
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppMentioned"
                    checked={prefs.inAppMentioned}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  When I'm mentioned
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="inAppAnnouncements"
                    checked={prefs.inAppAnnouncements}
                    onChange={handleChange}
                    className="w-4 h-4 rounded"
                  />
                  System announcements
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Quiet Hours Section */}
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🌙 Quiet Hours
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded">
              <input
                type="checkbox"
                name="quietHoursEnabled"
                checked={prefs.quietHoursEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="flex-1">
                <span className="font-medium text-[var(--text)]">Enable quiet hours</span>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Pause notifications during specific hours
                </p>
              </span>
            </label>

            {prefs.quietHoursEnabled && (
              <div className="ps-9 space-y-3 pt-2 border-l-2 border-[var(--border)]">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Start time
                  </label>
                  <input
                    type="time"
                    name="quietHourStart"
                    value={prefs.quietHourStart || '22:00'}
                    onChange={handleChange}
                    className="tt-input w-32 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text)]">
                    End time
                  </label>
                  <input
                    type="time"
                    name="quietHourEnd"
                    value={prefs.quietHourEnd || '08:00'}
                    onChange={handleChange}
                    className="tt-input w-32 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Digest Settings Section */}
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📬 Digest Settings
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded">
              <input
                type="checkbox"
                name="digestEnabled"
                checked={prefs.digestEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="flex-1">
                <span className="font-medium text-[var(--text)]">Enable digest emails</span>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Receive compiled updates instead of individual emails
                </p>
              </span>
            </label>

            {prefs.digestEnabled && (
              <div className="ps-9 space-y-3 pt-2 border-l-2 border-[var(--border)]">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Frequency
                  </label>
                  <select
                    name="digestFrequency"
                    value={prefs.digestFrequency || 'INSTANT'}
                    onChange={handleChange}
                    className="tt-select w-full text-sm"
                  >
                    <option value="INSTANT">Instant</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="NEVER">Never</option>
                  </select>
                </div>

                {(prefs.digestFrequency === 'DAILY' || prefs.digestFrequency === 'WEEKLY') && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[var(--text)]">
                      Send at
                    </label>
                    <input
                      type="time"
                      name="digestTime"
                      value={prefs.digestTime || '09:00'}
                      onChange={handleChange}
                      className="tt-input w-32 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2 sticky bottom-0 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="tt-btn tt-btn-primary px-6 py-2"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            onClick={fetchPreferences}
            disabled={saving}
            className="tt-btn tt-btn-outline px-6 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
