import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type {
  AuditIssue,
  CategoryScore,
  ComplianceCategory,
  RiskLevel,
  ScanResult,
} from '../types/scanner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ScanResultsDashboardProps {
  scanResult: ScanResult;
  isPremium?: boolean;
  onOpenBadgeGenerator: () => void;
  onOpenPricing: () => void;
  onOpenReport: () => void;
  onOpenAiCounsel: () => void;
  onOpenTemplates?: () => void;
}

interface CategoryPresentation {
  key: ComplianceCategory;
  title: string;
  icon: typeof ShieldCheck;
}

const CORE_CATEGORIES: CategoryPresentation[] = [
  { key: 'security', title: 'Security', icon: Lock },
  { key: 'gdpr', title: 'Privacy / DSGVO', icon: Scale },
  { key: 'accessibility', title: 'Accessibility', icon: Eye },
  { key: 'ai-act', title: 'AI Governance / EU AI Act', icon: Bot },
];

const OPTIONAL_CATEGORY_TITLES: Partial<Record<ComplianceCategory, string>> = {
  'legal-data': 'Unternehmensdaten',
  'consumer-protection': 'Verbraucherschutz',
  'supply-chain': 'Software-Lieferkette',
  esg: 'ESG',
  'ip-rights': 'IP Rights',
  dsa: 'DSA',
  copyright: 'Copyright',
};

function getCategory(scanResult: ScanResult, category: ComplianceCategory): CategoryScore | undefined {
  return scanResult.categories[category];
}

function getAssessmentLabel(category: CategoryScore | undefined): string {
  if (!category || category.totalChecks === 0) return 'Nicht bewertet';
  return `${category.score}%`;
}

function getAssessmentTone(category: CategoryScore | undefined): string {
  if (!category || category.totalChecks === 0) return 'text-muted-foreground';
  if (category.criticalCount > 0) return 'text-rose-500';
  if (category.warningCount > 0) return 'text-amber-500';
  return 'text-emerald-500';
}

function getIssueLabel(level: RiskLevel): string {
  if (level === 'critical') return 'Hohe Priorität';
  if (level === 'warning') return 'Prüfen';
  return 'Check bestanden';
}

function getIssueBadgeVariant(level: RiskLevel): 'destructive' | 'secondary' | 'outline' {
  if (level === 'critical') return 'destructive';
  if (level === 'warning') return 'secondary';
  return 'outline';
}

function visibleFinding(issue: AuditIssue): boolean {
  return issue.level === 'critical' || issue.level === 'warning';
}

export function ScanResultsDashboard({
  scanResult,
  isPremium = false,
  onOpenBadgeGenerator,
  onOpenPricing,
  onOpenReport,
  onOpenAiCounsel,
  onOpenTemplates,
}: ScanResultsDashboardProps) {
  const [levelFilter, setLevelFilter] = useState<RiskLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplianceCategory | 'all'>('all');

  const actionableIssues = useMemo(
    () => scanResult.issues.filter(visibleFinding),
    [scanResult.issues],
  );

  const filteredIssues = useMemo(
    () => actionableIssues.filter((issue) => {
      if (levelFilter !== 'all' && issue.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
      return true;
    }),
    [actionableIssues, categoryFilter, levelFilter],
  );

  const assessedCoreCategories = CORE_CATEGORIES.filter(({ key }) => {
    const category = getCategory(scanResult, key);
    return category && category.totalChecks > 0;
  }).length;

  const coreCoveragePercent = Math.round((assessedCoreCategories / CORE_CATEGORIES.length) * 100);
  const criticalCount = actionableIssues.filter((issue) => issue.level === 'critical').length;
  const warningCount = actionableIssues.filter((issue) => issue.level === 'warning').length;

  const optionalCategories = Object.entries(OPTIONAL_CATEGORY_TITLES)
    .map(([key, title]) => {
      const category = key as ComplianceCategory;
      return {
        key: category,
        title: title ?? category,
        data: getCategory(scanResult, category),
      };
    })
    .filter(({ data }) => data && data.totalChecks > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Card className="border-primary/30 bg-card/60">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="outline">Technical screening result</Badge>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Target</p>
                <h1 className="text-2xl md:text-3xl font-bold mt-1 break-all">{scanResult.targetDomain}</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                Der Scan zeigt technische Hinweise aus den Checks, die das Backend tatsächlich geliefert hat.
                Er ist keine Zertifizierung und keine Garantie für vollständige rechtliche oder technische Konformität.
              </p>
              <p className="text-xs text-muted-foreground">
                Scan-Zeitpunkt: {scanResult.scannedAt} · Client-Laufzeit: {scanResult.metrics.scanDurationMs} ms
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 min-w-fit">
              <div className="rounded-xl border bg-background/50 p-4 text-center">
                <div className="text-2xl font-bold">{coreCoveragePercent}%</div>
                <div className="text-[11px] text-muted-foreground mt-1">Core-Coverage</div>
              </div>
              <div className="rounded-xl border bg-background/50 p-4 text-center">
                <div className="text-2xl font-bold text-rose-500">{criticalCount}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Hohe Priorität</div>
              </div>
              <div className="rounded-xl border bg-background/50 p-4 text-center">
                <div className="text-2xl font-bold text-amber-500">{warningCount}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Zu prüfen</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Ausgeführte Kernbereiche</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Eine Kategorie ohne nachweisbare Checks wird als „Nicht bewertet“ angezeigt — nicht als 100 %.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_CATEGORIES.map(({ key, title, icon: Icon }) => {
            const category = getCategory(scanResult, key);
            const assessed = Boolean(category && category.totalChecks > 0);

            return (
              <Card
                key={key}
                className={`transition-colors ${categoryFilter === key ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-lg font-bold ${getAssessmentTone(category)}`}>
                      {getAssessmentLabel(category)}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-4">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    {assessed
                      ? `${category?.totalChecks ?? 0} erfasste Checks · ${category?.criticalCount ?? 0} hoch · ${category?.warningCount ?? 0} prüfen`
                      : 'Das aktuelle Backend hat für diesen Bereich keine belastbare Check-Coverage geliefert.'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 px-0"
                    onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
                    disabled={!assessed}
                  >
                    Findings filtern <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {optionalCategories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Weitere ausgeführte Bereiche</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {optionalCategories.map(({ key, title, data }) => (
              <Card key={key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{data?.totalChecks ?? 0} erfasste Checks</p>
                    </div>
                    <span className={`text-lg font-bold ${getAssessmentTone(data)}`}>
                      {getAssessmentLabel(data)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Findings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Technische Hinweise, die überprüft und priorisiert werden sollten.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={levelFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLevelFilter('all')}
            >
              Alle
            </Button>
            <Button
              variant={levelFilter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLevelFilter('critical')}
            >
              Hohe Priorität
            </Button>
            <Button
              variant={levelFilter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLevelFilter('warning')}
            >
              Prüfen
            </Button>
            {categoryFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')}>
                Kategorie zurücksetzen
              </Button>
            )}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold">Keine offenen Findings in diesem Filter</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Das bedeutet nur, dass die ausgeführten automatisierten Checks hier nichts gemeldet haben.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="mt-0.5">
                      {issue.level === 'critical' ? (
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getIssueBadgeVariant(issue.level)}>{getIssueLabel(issue.level)}</Badge>
                        <Badge variant="outline">{issue.category}</Badge>
                      </div>
                      <h3 className="font-semibold text-base mt-3">{issue.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{issue.description}</p>

                      {issue.lawReference && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Referenz aus Scanner-Ausgabe: {issue.lawReference}
                        </p>
                      )}

                      {issue.recommendation && (
                        <div className="mt-4 rounded-lg bg-muted/40 border p-3">
                          <p className="text-xs font-semibold">Vorgeschlagene Remediation</p>
                          <p className="text-sm text-muted-foreground mt-1">{issue.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nächste Schritte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={onOpenReport}>
            <FileText className="w-4 h-4 mr-2" />
            {isPremium ? 'Report öffnen' : 'Report ansehen'}
          </Button>
          <Button variant="outline" onClick={onOpenAiCounsel}>
            <Bot className="w-4 h-4 mr-2" /> AI Counsel
          </Button>
          {onOpenTemplates && (
            <Button variant="outline" onClick={onOpenTemplates}>Vorlagen</Button>
          )}
          <Button variant="outline" onClick={onOpenPricing}>Pläne</Button>
          <Button variant="outline" onClick={onOpenBadgeGenerator}>
            Trust Center / Badge Preview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
