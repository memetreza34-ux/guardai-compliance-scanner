const { HttpError } = require('../lib/httpError');

function createNotificationService({ organizationAuthorization, notificationRepository }) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Notification service requires Organization authorization.');
  }
  if (!notificationRepository) {
    throw new TypeError('Notification service requires Notification repository.');
  }

  async function list({ organizationId, userId, unreadOnly, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return notificationRepository.list({ organizationId, unreadOnly, limit, cursor });
  }

  async function markRead({ organizationId, userId, notificationId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const notification = await notificationRepository.markRead({ organizationId, notificationId });
    if (!notification) {
      throw new HttpError(404, 'Notification was not found in this organization.', 'NOTIFICATION_NOT_FOUND');
    }
    return notification;
  }

  async function markAllRead({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return notificationRepository.markAllRead(organizationId);
  }

  return { list, markAllRead, markRead };
}

module.exports = { createNotificationService };
