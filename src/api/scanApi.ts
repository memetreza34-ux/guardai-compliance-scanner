import scanContract from '../../shared/scan-contract.json';
import type {
  AuditIssue,
  CategoryScore,
  ComplianceCategory,
  RiskLevel,
  ScanResult,
} from '../types/scanner';
import type { ScanOptions } from '../types/scanOptions';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
const API_VERSION_PREFIX = '/api/v1';
const EXPECTED_CONTRACT_VERSION = scanContract.version;

const CATEGORY_MAP: Record<string, ComplianceCategory | undefined> = {
  privacy: 'gdpr',
  gdpr: 'gdpr',
  aiAct: 'ai-act',
  'ai-act': 'ai-act',
  accessibility: 'accessibility',
  security: 'security',
  legalData: 'legal-data',
  'legal-data': 'legal-data',
  consumerProtection: 'consumer-protection',
  'consumer-protection': 'consumer-protection',
  supplyChain: 'supply-chain',
  'supply-chain': 'supply-chain',
  esg: 'esg',
  ipRights: 'ip-rights',
  'ip-rights': 'ip-rights',
  dsa: 'dsa',
  copyright: 'copyright',
};

const CATEGORY_TITLES: Record<ComplianceCategory, string> = {
  'ai-act': 'EU AI Act',
  gdpr: 'DSGVO & Privacy',
  accessibility: 'Accessibility',
  security: 'Security',
  'legal-data': 'Unternehmensdaten',
  'consumer-protection': 'Verbraucherschutz',
  'supply-chain': 'Software-Lieferkette',
  esg: 'ESG',
  'ip-rights': 'IP Rights',
  dsa: 'DSA',
  copyright: 'Copyright',
};

interface BackendIssue {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  severity?: unknown;
  lawReference?: unknown;
  fixSuggestion?: unknown;
  recommendation?: unknown;
}

interface BackendCategory {
  score?: unknown;
  totalChecks?: unknown;
  passedChecks?: unknown;
  issues?: unknown;
}

interface BackendScanResponse {
  contractVersion?: unknown;
  url?: unknown;
  timestamp?: unknown;
  overallScore?: unknown;
  categories?: unknown;
  notices?: unknown;
}

export class ScanApiError extends Error {
  code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'ScanApiError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function readScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function readNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (value === 'critical') return 'critical';
  if (value === 'warning') return 'warning';
  if (value === 'passed' || value === 'compliant') return 'passed';
  return 'warning';
}

function normalizeIssue(
  raw: BackendIssue,
  category: ComplianceCategory,
  index: number,
): AuditIssue {
  return {
    id: readString(raw.id, `${category}-${index + 1}`),
    category,
    level: normalizeRiskLevel(raw.severity),
    title: readString(raw.title, 'Unbenanntes Finding'),
    description: readString(raw.description, 'Keine Beschreibung vom Scanner geliefert.'),
    lawReference: readString(raw.lawReference),
    recommendation: readString(raw.fixSuggestion, readString(raw.recommendation)),
  };
}

function normalizeCategory(
  category: ComplianceCategory,
  raw: BackendCategory,
  allIssues: AuditIssue[],
): CategoryScore {
  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const issues = rawIssues
    .filter(isRecord)
    .map((issue, index) => normalizeIssue(issue, category, index));

  allIssues.push(...issues);

  const criticalCount = issues.filter((issue) => issue.level === 'critical').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;
  const passedIssueCount = issues.filter((issue) => issue.level === 'passed').length;

  const explicitTotalChecks = readNonNegativeInteger(raw.totalChecks);
  const explicitPassedChecks = readNonNegativeInteger(raw.passedChecks);
  const totalChecks = explicitTotalChecks ?? issues.length;
  const passedChecks = Math.min(totalChecks, explicitPassedChecks ?? passedIssueCount);

  return {
    category,
    title: CATEGORY_TITLES[category],
    score: readScore(raw.score) ?? 0,
    totalChecks,
    passedChecks,
    criticalCount,
    warningCount,
  };
}

function emptyCoreCategory(category: ComplianceCategory): CategoryScore {
  return {
    category,
    title: CATEGORY_TITLES[category],
    score: 0,
    totalChecks: 0,
    passedChecks: 0,
    criticalCount: 0,
    warningCount: 0,
  };
}

function deriveTargetDomain(target: string | File, responseUrl: string): string {
  if (typeof target !== 'string') return target.name;

  const candidate = responseUrl || target;
  try {
    const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    return new URL(normalized).hostname;
  } catch {
    return candidate;
  }
}

function createRiskStatus(score: number): ScanResult['riskStatus'] {
  if (score >= 85) return 'COMPLIANT';
  if (score >= 60) return 'NEEDS_ACTION';
  return 'HIGH_RISK';
}

async function readApiError(response: Response): Promise<ScanApiError> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      if (typeof body.error === 'string') {
        return new ScanApiError(body.error);
      }

      if (isRecord(body.error) && typeof body.error.message === 'string') {
        return new ScanApiError(
          body.error.message,
          typeof body.error.code === 'string' ? body.error.code : null,
        );
      }
    }
  } catch {
    // Keep the user-safe fallback below if the backend does not return JSON.
  }

  return new ScanApiError(`Scanner API returned HTTP ${response.status}.`, 'HTTP_ERROR');
}

function normalizeResponse(
  payload: unknown,
  target: string | File,
  elapsedMs: number,
): ScanResult {
  if (!isRecord(payload)) {
    throw new ScanApiError('Scanner API returned an invalid response.');
  }

  const data = payload as BackendScanResponse;
  if (data.contractVersion !== EXPECTED_CONTRACT_VERSION) {
    throw new ScanApiError('Scanner API contract version is incompatible with this frontend.');
  }

  const rawCategories = isRecord(data.categories) ? data.categories : {};
  const issues: AuditIssue[] = [];
  const normalizedCategories: Partial<Record<ComplianceCategory, CategoryScore>> = {};

  for (const [backendKey, rawCategory] of Object.entries(rawCategories)) {
    const category = CATEGORY_MAP[backendKey];
    if (!category || !isRecord(rawCategory)) continue;

    normalizedCategories[category] = normalizeCategory(category, rawCategory, issues);
  }

  const categories = {
    'ai-act': normalizedCategories['ai-act'] ?? emptyCoreCategory('ai-act'),
    gdpr: normalizedCategories.gdpr ?? emptyCoreCategory('gdpr'),
    accessibility: normalizedCategories.accessibility ?? emptyCoreCategory('accessibility'),
    security: normalizedCategories.security ?? emptyCoreCategory('security'),
    ...normalizedCategories,
  } as ScanResult['categories'];

  const overallScore = readScore(data.overallScore);
  if (overallScore === null) {
    throw new ScanApiError('Scanner API did not return a valid overall score.');
  }

  const responseUrl = readString(data.url, typeof target === 'string' ? target : target.name);
  const scannedAt = readString(data.timestamp, new Date().toISOString());

  return {
    url: responseUrl,
    targetDomain: deriveTargetDomain(target, responseUrl),
    scannedAt,
    overallScore,
    industryAverageScore: 0,
    riskStatus: createRiskStatus(overallScore),
    categories,
    issues,
    notices: readStringArray(data.notices),
    detectedTech: {
      aiFrameworks: [],
      trackers: [],
      sslActive: typeof target === 'string' && /^https:\/\//i.test(target),
    },
    metrics: {
      scannedPages: 0,
      scanDurationMs: elapsedMs,
      domNodeCount: 0,
    },
  };
}

export async function requestComplianceScan(
  target: string | File,
  options: ScanOptions,
): Promise<ScanResult> {
  const startedAt = performance.now();
  let response: Response;

  try {
    if (typeof target === 'string') {
      response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: target,
          options: {
            aiAct: options.aiAct,
            gdpr: options.gdpr,
            wcag: options.wcag,
            security: options.security,
          },
        }),
      });
    } else {
      const formData = new FormData();
      formData.append('file', target);
      formData.append('options', JSON.stringify(options));

      response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/scan-file`, {
        method: 'POST',
        body: formData,
      });
    }
  } catch (error) {
    console.error('GuardAI scanner API request failed:', error);
    throw new ScanApiError('GuardAI scanner backend is not reachable.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ScanApiError('Scanner API returned invalid JSON.', 'INVALID_JSON');
  }

  return normalizeResponse(payload, target, Math.round(performance.now() - startedAt));
}
