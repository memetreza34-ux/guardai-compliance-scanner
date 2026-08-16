export type MonitorStatus = 'active' | 'paused' | 'disabled';
export type NotificationType = 'new_finding' | 'scan_failed';

export interface WorkspaceMonitor {
  id: string;
  organizationId: string;
  targetId: string;
  moduleId: 'security';
  status: MonitorStatus;
  scheduleMinutes: number;
  nextRunAt: string;
  leasedAt: string | null;
  leaseExpiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceNotification {
  id: string;
  organizationId: string;
  type: NotificationType;
  scanId: string | null;
  findingId: string | null;
  severity: 'critical' | 'warning' | 'info' | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: WorkspaceNotification[];
  nextCursor: string | null;
}
