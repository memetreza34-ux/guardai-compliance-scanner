export type ComplianceCategory = 'ai-act' | 'gdpr' | 'accessibility' | 'security' | 'legal-data' | 'consumer-protection';
export type RiskLevel = 'critical' | 'warning' | 'passed';

export interface AuditIssue {
  id: string;
  category: ComplianceCategory;
  level: RiskLevel;
  title: string;
  description: string;
  lawReference: string; // e.g. "EU AI Act Art. 50 (1)" or "DSGVO Art. 13"
  recommendation: string;
  codeSnippet?: string;
  affectedElement?: string;
}

export interface CategoryScore {
  category: ComplianceCategory;
  title: string;
  score: number; // 0 to 100
  totalChecks: number;
  passedChecks: number;
  criticalCount: number;
  warningCount: number;
}

export interface ScanResult {
  url: string;
  targetDomain: string;
  scannedAt: string;
  overallScore: number;
  riskStatus: 'COMPLIANT' | 'NEEDS_ACTION' | 'HIGH_RISK';
  categories: Record<ComplianceCategory, CategoryScore>;
  issues: AuditIssue[];
  detectedTech: {
    aiFrameworks: string[];
    trackers: string[];
    cms?: string;
    sslActive: boolean;
  };
  metrics: {
    scannedPages: number;
    scanDurationMs: number;
    domNodeCount: number;
  };
}

export interface TrustBadgeConfig {
  theme: 'dark-glass' | 'emerald-clean' | 'neon-border' | 'minimal-shield';
  showScore: boolean;
  language: 'de' | 'en';
  position: 'bottom-right' | 'bottom-left' | 'inline';
}

export interface ScanProgressStep {
  id: number;
  message: string;
  status: 'pending' | 'running' | 'completed';
  timestamp: string;
}
