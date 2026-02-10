/**
 * TIMEZONE UTILITY
 * Helper functions for timezone conversions
 */

/**
 * Convert time from UTC to user's timezone
 * @param {Date} utcDate - UTC date
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 */
export function convertTz(utcDate, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return new Date(formatter.format(utcDate));
}

/**
 * Get user's timezone offset
 * @param {string} timezone - IANA timezone
 */
export function getTimezoneOffset(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });

  const parts = formatter.formatToParts(new Date());
  const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC';
  return offset;
}

/**
 * Get common timezones
 */
export const COMMON_TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US Eastern', value: 'America/New_York' },
  { label: 'US Central', value: 'America/Chicago' },
  { label: 'US Mountain', value: 'America/Denver' },
  { label: 'US Pacific', value: 'America/Los_Angeles' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'India Standard Time', value: 'Asia/Kolkata' },
];

export default {
  convertTz,
  getTimezoneOffset,
  COMMON_TIMEZONES,
};
