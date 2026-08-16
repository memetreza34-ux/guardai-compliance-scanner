import { ArrowLeft, FileText, Printer, ShieldCheck } from 'lucide-react';
import type { ComplianceCategory, ScanResult } from '../types/scanner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface TechnicalScanReportProps {
  scanResult: ScanResult;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  'ai-act': 'AI Governance / EU AI Act',
  gdpr: 'Privacy / DSGVO',
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

export function TechnicalScanReport({ scanResult, onBack }: TechnicalScanReportProps) {
  const actionableIssues = scanResult.issues.filter((issue) => issue.level !== 'passed');
  const assessedCategories = Object.values(scanResult.categories).filter(
    (category) => category && category.totalChecks > 0,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Zurück
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Drucken / als PDF speichern
        </Button>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-6 md:p-10 print:p-0">
          <header className="border-b pb-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge variant="outline">Technical Screening Report</Badge>
                <h1 className="text-3xl font-bold mt-4">GuardAI Scan Report</h1>
                <p className="text-muted-foreground mt-2 break-all">{scanResult.targetDomain}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Scan-Zeitpunkt</p>
                <p className="mt-1">{scanResult.scannedAt}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Erfasste Kategorien</p>
                <p className="mt-1">{assessedCategories.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Offene Hinweise</p>
                <p className="mt-1">{actionableIssues.length}</p>
              </div>
            </div>
          </header>

          <section className="py-7 border-b">
            <h2 className="text-xl font-bold">Einordnung</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Dieser Report dokumentiert die technische Ausgabe der aktuell ausgeführten GuardAI-Checks. Er ist keine offizielle
              Zertifizierung, kein Penetrationstest und keine Garantie vollständiger rechtlicher Konformität. Kategorien ohne belastbare
              Check-Coverage werden nicht als bestanden gewertet.
            </p>
          </section>

          <section className="py-7 border-b">
            <h2 className="text-xl font-bold">Bewertete Bereiche</h2>
            {assessedCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">Das Backend hat keine belastbare Kategorie-Coverage geliefert.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {assessedCategories.map((category) => (
                  <div key={category.category} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{CATEGORY_LABELS[category.category]}</span>
                      </div>
                      <span className="font-bold">{category.score}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {category.totalChecks} erfasste Checks · {category.criticalCount} hohe Priorität · {category.warningCount} prüfen
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="py-7">
            <h2 className="text-xl font-bold">Findings</h2>
            {actionableIssues.length === 0 ? (
              <div className="mt-4 rounded-xl border p-5">
                <p className="font-semibold">Keine offenen Findings aus den ausgeführten Checks.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Das ist keine Aussage über nicht ausgeführte Checks oder manuell zu prüfende Bereiche.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {actionableIssues.map((issue, index) => (
                  <article key={issue.id} className="rounded-xl border p-5 break-inside-avoid">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>#{index + 1}</span>
                      <span>·</span>
                      <span>{CATEGORY_LABELS[issue.category]}</span>
                      <span>·</span>
                      <span>{issue.level === 'critical' ? 'Hohe Priorität' : 'Prüfen'}</span>
                    </div>
                    <h3 className="font-bold mt-2">{issue.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{issue.description}</p>
                    {issue.lawReference && (
                      <p className="text-xs text-muted-foreground mt-3">Scanner-Referenz: {issue.lawReference}</p>
                    )}
                    {issue.recommendation && (
                      <div className="mt-4 rounded-lg bg-muted/30 p-3">
                        <p className="text-xs font-semibold">Vorgeschlagene Remediation</p>
                        <p className="text-sm text-muted-foreground mt-1">{issue.recommendation}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="border-t pt-5 text-xs text-muted-foreground">
            GuardAI Prototype · Technical evidence & risk screening · Report generated from the current scan result.
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
