import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type {
  TechnicalReportCreateResult,
  TechnicalReportPage,
  TechnicalReportRecord,
} from '../types/report';

const CURRENT_REPORT_SCHEMA_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertReportRecord(value: unknown): TechnicalReportRecord {
  if (!isRecord(value) || !isRecord(value.snapshot)) {
    throw new GuardApiError('Technical report response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.organizationId !== 'string' ||
    typeof value.scanId !== 'string' ||
    value.reportType !== 'technical-screening' ||
    value.schemaVersion !== CURRENT_REPORT_SCHEMA_VERSION ||
    value.snapshot.schemaVersion !== CURRENT_REPORT_SCHEMA_VERSION ||
    value.snapshot.reportType !== 'technical-screening' ||
    typeof value.snapshotHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.snapshotHash)
  ) {
    throw new GuardApiError(
      'Technical report schema is incompatible with this frontend.',
      'INCOMPATIBLE_REPORT_SCHEMA',
      200,
    );
  }
  return value as unknown as TechnicalReportRecord;
}

export function createReportApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function createReport(
    organizationId: string,
    scanId: string,
  ): Promise<TechnicalReportCreateResult> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/scans/${encodeURIComponent(scanId)}/reports`,
      { method: 'POST' },
    );
    if (!isRecord(payload) || typeof payload.idempotentReplay !== 'boolean') {
      throw new GuardApiError('Technical report create response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return {
      report: assertReportRecord(payload.report),
      idempotentReplay: payload.idempotentReplay,
    };
  }

  async function getReport(
    organizationId: string,
    reportId: string,
  ): Promise<TechnicalReportRecord> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/reports/${encodeURIComponent(reportId)}`,
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Technical report response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertReportRecord(payload.report);
  }

  async function listReports(
    organizationId: string,
    options: { scanId?: string; limit?: number; cursor?: string } = {},
  ): Promise<TechnicalReportPage> {
    const query = new URLSearchParams();
    if (options.scanId) query.set('scanId', options.scanId);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    if (options.cursor) query.set('cursor', options.cursor);
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/reports${suffix}`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.reports)) {
      throw new GuardApiError('Technical report list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    if (payload.nextCursor !== null && typeof payload.nextCursor !== 'string') {
      throw new GuardApiError('Technical report pagination is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return {
      reports: payload.reports.map(assertReportRecord),
      nextCursor: payload.nextCursor as string | null,
    };
  }

  return {
    createReport,
    getReport,
    listReports,
  };
}

export type ReportApi = ReturnType<typeof createReportApi>;
