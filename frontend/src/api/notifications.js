import { request } from './client.js';

export async function getNotifications(options = {}) {
  const { unread_only = false } = options;
  const params = new URLSearchParams({ unread_only: String(unread_only) });
  return request(`/notifications?${params.toString()}`);
}

export async function markNotificationsRead() {
  return request('/notifications/read', {
    method: 'POST',
  });
}
