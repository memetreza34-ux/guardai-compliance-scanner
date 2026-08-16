import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type {
  MonitorStatus,
  NotificationPage,
  WorkspaceMonitor,
  WorkspaceNotification,
} from '../types/monitoring';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireMonitor(value: unknown): WorkspaceMonitor {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.status !== 'string') {
    throw new GuardApiError('Monitor response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as WorkspaceMonitor;
}

function requireNotification(value: unknown): WorkspaceNotification {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') {
    throw new GuardApiError('Notification response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as WorkspaceNotification;
}

export function createMonitoringApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listMonitors(organizationId: string): Promise<WorkspaceMonitor[]> {
    const payload = await client.request(`/organizations/${encodeURIComponent(organizationId)}/monitors`);
    if (!isRecord(payload) || !Array.isArray(payload.monitors)) {
      throw new GuardApiError('Monitor list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.monitors.map(requireMonitor);
  }

  async function createMonitor(
    organizationId: string,
    input: { targetId: string; scheduleMinutes: number },
  ): Promise<WorkspaceMonitor> {
    const payload = await client.request(`/organizations/${encodeURIComponent(organizationId)}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: input.targetId,
        moduleId: 'security',
        scheduleMinutes: input.scheduleMinutes,
      }),
    });
    if (!isRecord(payload)) {
      throw new GuardApiError('Monitor create response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireMonitor(payload.monitor);
  }

  async function setMonitorStatus(
    organizationId: string,
    monitorId: string,
    status: MonitorStatus,
  ): Promise<WorkspaceMonitor> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/monitors/${encodeURIComponent(monitorId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Monitor status response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireMonitor(payload.monitor);
  }

  async function listNotifications(
    organizationId: string,
    options: { unreadOnly?: boolean; limit?: number; cursor?: string } = {},
  ): Promise<NotificationPage> {
    const query = new URLSearchParams();
    if (options.unreadOnly !== undefined) query.set('unreadOnly', String(options.unreadOnly));
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    if (options.cursor) query.set('cursor', options.cursor);
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/notifications${suffix}`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.notifications)) {
      throw new GuardApiError('Notification list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return {
      notifications: payload.notifications.map(requireNotification),
      nextCursor: typeof payload.nextCursor === 'string' ? payload.nextCursor : null,
    };
  }

  async function markNotificationRead(
    organizationId: string,
    notificationId: string,
  ): Promise<WorkspaceNotification> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'POST' },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Notification update response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireNotification(payload.notification);
  }

  async function markAllNotificationsRead(organizationId: string): Promise<number> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/notifications/read-all`,
      { method: 'POST' },
    );
    if (!isRecord(payload) || typeof payload.updated !== 'number') {
      throw new GuardApiError('Notification update response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.updated;
  }

  return {
    createMonitor,
    listMonitors,
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    setMonitorStatus,
  };
}

export type MonitoringApi = ReturnType<typeof createMonitoringApi>;
