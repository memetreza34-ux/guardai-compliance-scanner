import React, { useState } from 'react';
import { ShieldCheck, Printer, ArrowLeft, Badge as BadgeIcon, Lock, Upload } from 'lucide-react';
import type { ScanResult } from '../types/scanner';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface PrintableReportProps {
  scanResult: ScanResult;
  isPremium: boolean;
  onBack: () => void;
  onUpgrade: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ scanResult, isPremium, onBack, onUpgrade }) => {
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAgencyLogo(url);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Action Header (hidden in print) */}
      <div className="no-print flex justify-between items-center mb-8">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zum Dashboard
        </Button>
        
        <div className="flex gap-4">
          {isPremium && (
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="secondary">
                <Upload className="w-4 h-4 mr-2" /> Logo hochladen (White-Label)
              </Button>
            </div>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Als PDF speichern / Drucken
          </Button>
        </div>
      </div>

      {/* Official Audit Document Container (Printable Area) */}
      <Card className="bg-background border-border text-foreground print:border-none print:shadow-none">
        <CardContent className="p-8 sm:p-12">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b-2 border-foreground pb-6 mb-8">
            <div>
              {agencyLogo ? (
                <img src={agencyLogo} alt="Agency Logo" className="h-12 object-contain mb-2" />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <span className="text-2xl font-extrabold tracking-tight">
                    Guard<span className="text-primary">AI</span> Verification Authority
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Offizielles Audit-Dossier zur Konformitätsbewertung (EU AI Act & DSGVO)
              </p>
            </div>

            <div className="text-right text-sm text-muted-foreground font-mono space-y-1">
              <div>Doc-ID: <span className="font-bold text-foreground">GAI-AUDIT-{Math.floor(100000 + Math.random() * 900000)}</span></div>
              <div>Datum: {scanResult.scannedAt}</div>
              <div>Methode: Deep-Scan v2.6</div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-muted/50 p-5 rounded-lg border mb-8">
            <h3 className="text-lg font-bold mb-2">Management Summary</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Am {scanResult.scannedAt} wurde die digitale Anwendung unter <strong className="text-foreground">{scanResult.url}</strong> einer automatisierten Konformitätsprüfung unterzogen. Der berechnete Gesamtsicherheits-Score beträgt <strong className="text-primary">{scanResult.overallScore} / 100 Punkten</strong> (Status: <strong>{scanResult.riskStatus}</strong>).
            </p>
          </div>

          {/* Table of Scores */}
          <h3 className="text-lg font-bold mb-4">1. Auswertung nach Rechts- & Prüfkategorien</h3>
          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kategorie</th>
                  <th className="px-4 py-3 font-semibold">Rechtsgrundlage</th>
                  <th className="px-4 py-3 font-semibold">Erfüllungsgrad</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.values(scanResult.categories).map((cat) => (
                  <tr key={cat.category} className="bg-background">
                    <td className="px-4 py-3 font-medium">{cat.title}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {cat.category === 'ai-act' && 'EU AI Act Art. 50'}
                      {cat.category === 'gdpr' && 'DSGVO Art. 6, 13, 32'}
                      {cat.category === 'accessibility' && 'BFSG / WCAG 2.1 AA'}
                      {cat.category === 'security' && 'ISO 27001 / BSI / OWASP'}
                      {cat.category === 'legal-data' && 'TMG / HGB / UrhG'}
                      {cat.category === 'consumer-protection' && 'PAngV / BGB / UWG'}
                    </td>
                    <td className="px-4 py-3 font-bold">{cat.score}%</td>
                    <td className="px-4 py-3">
                      {cat.score >= 85 ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 bg-emerald-500/10">Erfüllt</Badge>
                      ) : cat.score >= 60 ? (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10">Handlungsbedarf</Badge>
                      ) : (
                        <Badge variant="destructive">Kritisch</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed Findings */}
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            2. Festgestellte Befunde & Abhilfemaßnahmen
          </h3>
          <div className="space-y-4 mb-12">
            {scanResult.issues.map((issue, idx) => {
              if (!isPremium && idx >= 2) {
                if (idx === 2) {
                  return (
                    <div key="paywall-overlay" className="relative p-8 border rounded-lg bg-card text-center overflow-hidden h-48 flex flex-col justify-center items-center">
                      <div className="absolute inset-0 bg-muted/20 backdrop-blur-sm z-0"></div>
                      <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
                        <Lock className="w-8 h-8 text-primary mb-3" />
                        <h4 className="font-bold text-lg mb-2">Premium Bericht erforderlich</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          {scanResult.issues.length - 2} weitere kritische Sicherheits- und Compliance-Befunde sind in der Vorschau-Version verborgen.
                        </p>
                        <Button onClick={onUpgrade} className="no-print">
                          Auf Pro upgraden & vollständigen Bericht anzeigen
                        </Button>
                      </div>
                    </div>
                  );
                }
                return null;
              }

              return (
                <div key={issue.id} className="p-4 border rounded-lg bg-card text-sm page-break-inside-avoid">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">#{idx + 1} {issue.title}</span>
                    <Badge variant={issue.level === 'critical' ? 'destructive' : issue.level === 'warning' ? 'outline' : 'secondary'} className={issue.level === 'warning' ? 'text-amber-500 border-amber-500/50' : ''}>
                      {issue.level.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{issue.description}</p>
                  <div className="bg-primary/5 p-3 rounded border-l-4 border-l-primary font-medium text-foreground">
                    Empfehlung: {issue.recommendation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Signoff Footer */}
          <div className="mt-12 pt-6 border-t flex justify-between items-end text-xs text-muted-foreground">
            <div>
              <div className="font-bold text-foreground">GuardAI Compliance Suite</div>
              <div>Verifizierung per API unter: https://guardai.io/verify</div>
            </div>

            <div className="text-right flex flex-col items-center">
              <BadgeIcon className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <div className="border-t border-muted-foreground w-40 pt-1 text-center">
                Digitales Prüfsiegel
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
