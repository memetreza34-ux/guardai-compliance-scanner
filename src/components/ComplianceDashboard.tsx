import { useState } from 'react';
import type { ScanResult, RiskLevel, ComplianceCategory } from '../types/scanner';
import { Lock, Zap, Bot, Copy, Check, GitPullRequest, FileText, AlertTriangle, CheckCircle2, ShieldAlert, Scale, Eye, Award, Bell, ShieldCheck, Globe, Leaf, Copyright, UserX } from 'lucide-react';
import { RemediationModal } from './RemediationModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';

interface ComplianceDashboardProps {
  scanResult: ScanResult;
  isPremium?: boolean;
  onOpenBadgeGenerator: () => void;
  onOpenPricing: () => void;
  onOpenReport: () => void;
  onOpenAiCounsel: () => void;
  onOpenTemplates?: () => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  scanResult,
  isPremium = false,
  onOpenBadgeGenerator,
  onOpenPricing,
  onOpenReport,
  onOpenAiCounsel,
  onOpenTemplates
}) => {
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ComplianceCategory | 'all'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [remediationIssue, setRemediationIssue] = useState<{title: string, codeSnippet?: string, affectedElement?: string} | null>(null);

  const filteredIssues = scanResult.issues.filter(issue => {
    if (filterLevel !== 'all' && issue.level !== filterLevel) return false;
    if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
    return true;
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const strokeDashoffset = 283 - (283 * scanResult.overallScore) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner Status Card */}
      <Card className="border-l-4 border-l-primary shadow-sm bg-card/50">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="uppercase tracking-wider">Audit-Ergebnis für:</span>
              <span className="font-mono text-primary">{scanResult.targetDomain}</span>
              <span className="text-muted-foreground">({scanResult.scannedAt})</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {scanResult.riskStatus === 'COMPLIANT' && '✅ Vollständig konform – Keine Sicherheitslücken'}
              {scanResult.riskStatus === 'NEEDS_ACTION' && '⚠️ Handlungsbedarf bei AI Act & DSGVO'}
              {scanResult.riskStatus === 'HIGH_RISK' && '🚨 Akute Bußgeld- & Haftungsrisiken festgestellt! Sofortiger Handlungsbedarf!'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Erkannte KI: <span className="text-foreground">{scanResult.detectedTech.aiFrameworks.join(', ')}</span> | Tracker: <span className="text-foreground">{scanResult.detectedTech.trackers.join(', ')}</span>
            </p>
          </div>

          {/* Circular SVG Gauge */}
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-muted fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className={`fill-none ${getScoreBadgeColor(scanResult.overallScore)} transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold leading-none">{scanResult.overallScore}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Score</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={onOpenBadgeGenerator} size="sm" className="w-full justify-start">
                <Award className="w-4 h-4 mr-2" /> Trust-Badge aktivieren
              </Button>
              <Button onClick={onOpenPricing} variant="outline" size="sm" className="w-full justify-start">
                <Bell className="w-4 h-4 mr-2 text-primary" /> Abo-Überwachung
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 Category Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* AI Act */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'ai-act' ? 'all' : 'ai-act')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'ai-act' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['ai-act'].score}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">EU AI Act Transparenz</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['ai-act'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['ai-act'].warningCount} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* DSGVO */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'gdpr' ? 'all' : 'gdpr')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'gdpr' ? 'ring-2 ring-cyan-500 bg-cyan-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['gdpr'].score}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">DSGVO & Privacy</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['gdpr'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['gdpr'].warningCount} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'accessibility' ? 'all' : 'accessibility')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'accessibility' ? 'ring-2 ring-emerald-500 bg-emerald-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['accessibility'].score}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Barrierefreiheit (BFSG)</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['accessibility'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['accessibility'].warningCount} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'security' ? 'all' : 'security')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'security' ? 'ring-2 ring-amber-500 bg-amber-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['security'].score}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Source Code & Security</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['security'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['security'].warningCount} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* Legal Data */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'legal-data' ? 'all' : 'legal-data')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'legal-data' ? 'ring-2 ring-indigo-500 bg-indigo-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['legal-data']?.score || 100}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Unternehmensdaten & Impressum</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['legal-data']?.criticalCount || 0} Akute Rechtsverstöße • {scanResult.categories['legal-data']?.warningCount || 0} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* Consumer Protection */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'consumer-protection' ? 'all' : 'consumer-protection')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'consumer-protection' ? 'ring-2 ring-rose-500 bg-rose-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['consumer-protection']?.score || 100}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Verbraucherschutz & UX</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['consumer-protection']?.criticalCount || 0} Akute Rechtsverstöße • {scanResult.categories['consumer-protection']?.warningCount || 0} Warnungen
            </p>
          </CardContent>
        </Card>
        {/* Supply Chain / NIS2 */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'supply-chain' ? 'all' : 'supply-chain')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'supply-chain' ? 'ring-2 ring-violet-500 bg-violet-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['supply-chain']?.score || 100}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Software Lieferkette (NIS2)</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['supply-chain']?.criticalCount || 0} Akute Rechtsverstöße • {scanResult.categories['supply-chain']?.warningCount || 0} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* ESG & CSRD */}
        {scanResult.categories['esg'] && (
          <Card 
            onClick={() => setFilterCategory(filterCategory === 'esg' ? 'all' : 'esg')}
            className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'esg' ? 'ring-2 ring-lime-500 bg-lime-500/5' : ''}`}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-500">
                  <Leaf className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold">{scanResult.categories['esg'].score}%</span>
              </div>
              <h3 className="text-sm font-bold mb-1">ESG & Nachhaltigkeit</h3>
              <p className="text-xs text-muted-foreground">
                {scanResult.categories['esg'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['esg'].warningCount} Warnungen
              </p>
            </CardContent>
          </Card>
        )}



        {/* Copyright (New for Assets) */}
        {scanResult.categories['copyright'] && (
          <Card 
            onClick={() => setFilterCategory(filterCategory === 'copyright' as any ? 'all' : 'copyright' as any)}
            className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'copyright' as any ? 'ring-2 ring-cyan-500 bg-cyan-500/5' : ''}`}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold">{scanResult.categories['copyright'].score}%</span>
              </div>
              <h3 className="text-sm font-bold mb-1">Urheberrecht & Disclaimer</h3>
              <p className="text-xs text-muted-foreground">
                {scanResult.categories['copyright'].criticalCount} Akute Rechtsverstöße • {scanResult.categories['copyright'].warningCount} Warnungen
              </p>
            </CardContent>
          </Card>
        )}

        {/* IP Rights */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'ip-rights' ? 'all' : 'ip-rights')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'ip-rights' ? 'ring-2 ring-fuchsia-500 bg-fuchsia-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
                <Copyright className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['ip-rights']?.score || 100}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Urheberrecht & IP</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['ip-rights']?.criticalCount || 0} Akute Rechtsverstöße • {scanResult.categories['ip-rights']?.warningCount || 0} Warnungen
            </p>
          </CardContent>
        </Card>

        {/* DSA & Jugendschutz */}
        <Card 
          onClick={() => setFilterCategory(filterCategory === 'dsa' ? 'all' : 'dsa')}
          className={`cursor-pointer transition-all hover:bg-accent/50 ${filterCategory === 'dsa' ? 'ring-2 ring-orange-500 bg-orange-500/5' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <UserX className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold">{scanResult.categories['dsa']?.score || 100}%</span>
            </div>
            <h3 className="text-sm font-bold mb-1">DSA & Jugendschutz</h3>
            <p className="text-xs text-muted-foreground">
              {scanResult.categories['dsa']?.criticalCount || 0} Akute Rechtsverstöße • {scanResult.categories['dsa']?.warningCount || 0} Warnungen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Risk Management (Phase 2) */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> Vendor Risk Management (Sub-Processors)
          </CardTitle>
          <CardDescription>
            Automatisch erkannte Drittanbieter und APIs. Wichtig für Schrems II und NIS2 Compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-4 border flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">OpenAI API</p>
                <p className="text-xs text-muted-foreground">LLM Processor</p>
              </div>
              <Badge variant="outline">EU (Frankfurt)</Badge>
            </div>
            <div className="bg-background rounded-lg p-4 border flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Vercel</p>
                <p className="text-xs text-muted-foreground">Hosting</p>
              </div>
              <Badge variant="outline">Global</Badge>
            </div>
            <div className="bg-background rounded-lg p-4 border flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Google Analytics 4</p>
                <p className="text-xs text-muted-foreground">Analytics</p>
              </div>
              <Badge variant="outline" className="text-rose-500 border-rose-500/30 bg-rose-500/10">US Transfer Risk</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-3 gap-4">
        {/* Benchmark Card */}
        <Card className="md:col-span-2 bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                Branchen-Vergleich
              </div>
              <h3 className="text-xl font-bold">Wie sicher bist du im Vergleich?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dein aktueller Risk-Score liegt bei <strong className="text-foreground">{scanResult.overallScore}%</strong>. 
                Der Durchschnitt in deiner Branche (SaaS & E-Commerce) liegt bei <strong className="text-foreground">{scanResult.industryAverageScore}%</strong>. 
                {scanResult.overallScore < scanResult.industryAverageScore ? 
                  ' Deine Plattform ist angreifbarer als die deiner Mitbewerber.' : 
                  ' Du bist aktuell besser aufgestellt als der Durchschnitt.'}
              </p>
            </div>
            
            {/* Visual Bar Chart Comparison */}
            <div className="w-full sm:w-48 space-y-4 shrink-0">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>Dein Score</span>
                  <span>{scanResult.overallScore}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getScoreBadgeColor(scanResult.overallScore).split(' ')[0].replace('text-', 'bg-')}`} 
                    style={{ width: `${scanResult.overallScore}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Industrie-Schnitt</span>
                  <span className="text-muted-foreground">{scanResult.industryAverageScore}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/40 rounded-full" 
                    style={{ width: `${scanResult.industryAverageScore}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agency Upsell Card */}
        <Card className="bg-primary/5 border-primary/20 flex flex-col justify-center">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg leading-tight">Überfordert mit den Fixes?</h3>
            <p className="text-xs text-muted-foreground">
              Unser Expertenteam behebt alle kritischen Bugs und DSGVO-Verstöße direkt in deinem Code.
            </p>
            <Button 
              className="w-full font-bold shadow-lg shadow-primary/20" 
              variant="default"
              onClick={() => alert("Hier würde sich ein Calendly-Widget zur Terminbuchung für den 1.500€ Audit-Fixing-Service öffnen.")}
            >
              Agentur beauftragen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Accordion Audit Findings */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">Audit-Befunde & Behebungsanleitungen</CardTitle>
            <CardDescription>Zeige {filteredIssues.length} von {scanResult.issues.length} Prüfpunkten</CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterLevel === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterLevel('all')}
              className="h-8"
            >
              Alle ({scanResult.issues.length})
            </Button>
            <Button
              variant={filterLevel === 'critical' ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => setFilterLevel('critical')}
              className={`h-8 ${filterLevel !== 'critical' ? 'text-destructive' : ''}`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Akutes Bußgeldrisiko
            </Button>
            <Button
              variant={filterLevel === 'warning' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setFilterLevel('warning')}
              className={`h-8 ${filterLevel !== 'warning' ? 'text-amber-500' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50'}`}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Warnung
            </Button>
            <Button
              variant={filterLevel === 'passed' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setFilterLevel('passed')}
              className={`h-8 ${filterLevel !== 'passed' ? 'text-emerald-500' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Erfüllt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion className="w-full space-y-2">
            {filteredIssues.map((issue, idx) => (
              <AccordionItem key={issue.id} value={issue.id} className="border bg-muted/30 px-4 rounded-lg">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    {issue.level === 'critical' && (
                      <Badge variant="destructive" className="flex items-center gap-1 uppercase text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> Gesetzwidrig
                      </Badge>
                    )}
                    {issue.level === 'warning' && (
                      <Badge variant="outline" className="flex items-center gap-1 uppercase text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/50">
                        <ShieldAlert className="w-3 h-3" /> Warnung
                      </Badge>
                    )}
                    {issue.level === 'passed' && (
                      <Badge variant="outline" className="flex items-center gap-1 uppercase text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/50">
                        <CheckCircle2 className="w-3 h-3" /> Konform
                      </Badge>
                    )}

                    <div>
                      <h4 className="text-sm font-bold">{issue.title}</h4>
                      <p className="text-xs text-muted-foreground font-normal">
                        Rechtsgrundlage: <span className="font-mono text-primary">{issue.lawReference}</span>
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 relative">
                  {!isPremium && idx >= 2 ? (
                    <>
                      {/* Blurred Fake Content */}
                      <div className="filter blur-md select-none opacity-40 space-y-3 pointer-events-none">
                        <p className="text-sm text-foreground/80 leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                          <span className="font-bold text-primary flex items-center gap-1 mb-1">
                            <Zap className="w-3.5 h-3.5" /> Empfohlene Lösung:
                          </span>
                          <p className="text-foreground/90">Detaillierte Handlungsanweisungen und Fixes sind hier versteckt.</p>
                        </div>
                      </div>
                      
                      {/* Paywall Overlay */}
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/10 backdrop-blur-[2px] rounded-lg">
                        <div className="bg-card p-4 rounded-xl border shadow-xl flex flex-col items-center text-center max-w-xs">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                            <Lock className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold mb-1">Premium-Befund</h4>
                          <p className="text-xs text-muted-foreground mb-4">Aktualisiere auf den Pro-Tarif, um diesen kritischen Fehler und den Lösungscode zu sehen.</p>
                          <Button size="sm" onClick={onOpenPricing} className="w-full">
                            Jetzt freischalten
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground/80 leading-relaxed">{issue.description}</p>
    
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                        <span className="font-bold text-primary flex items-center gap-1 mb-1">
                          <Zap className="w-3.5 h-3.5" /> Empfohlene Lösung:
                        </span>
                        <p className="text-foreground/90">{issue.recommendation}</p>
                      </div>
    
                      {issue.affectedElement && (
                        <div className="text-xs text-muted-foreground">
                          Betroffenes Element: <code className="text-amber-500 font-mono bg-muted px-1.5 py-0.5 rounded">{issue.affectedElement}</code>
                        </div>
                      )}
    
                      {issue.codeSnippet && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Fix-Code Snippet:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyCode(issue.codeSnippet!, issue.id)}
                              className="h-6 px-2 text-primary hover:text-primary/80"
                            >
                              {copiedCodeId === issue.id ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
                              {copiedCodeId === issue.id ? 'Kopiert!' : 'Code kopieren'}
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto text-foreground/80 border">
                            {issue.codeSnippet}
                          </pre>
                        </div>
                      )}

                      <div className="pt-2 flex flex-wrap gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => {
                            if (isPremium) {
                              setRemediationIssue({
                                title: issue.title,
                                codeSnippet: issue.codeSnippet,
                                affectedElement: issue.affectedElement
                              });
                            } else {
                              onOpenPricing();
                            }
                          }}
                          className={`w-full sm:w-auto ${!isPremium ? 'bg-primary/90' : ''}`}
                        >
                          <GitPullRequest className="w-4 h-4 mr-2" /> 
                          {isPremium ? '1-Click Fix (GitHub PR)' : 'Auto-Fix freischalten (Pro)'}
                          {!isPremium && <Lock className="w-3 h-3 ml-2 opacity-70" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onOpenTemplates} className="w-full sm:w-auto">
                          <FileText className="w-4 h-4 mr-2" /> Vorlage anzeigen
                        </Button>
                        <Button variant="outline" size="sm" onClick={onOpenAiCounsel} className="w-full sm:w-auto">
                          <Bot className="w-4 h-4 mr-2 text-primary" /> KI-Experten befragen
                        </Button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Bottom CTA Card */}
      <Card className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8">
          <h3 className="text-2xl font-extrabold mb-2">Schütze deine App dauerhaft vor KI-Verstößen</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Aktiviere das automatische Monats-Monitoring. GuardAI prüft deine Website jeden Monat neu und warnt dich sofort, wenn neue KI-Richtlinien oder Verstöße auftreten.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Button onClick={onOpenPricing} size="lg" className="font-bold">
              <Zap className="w-4 h-4 mr-2" /> Abo für 199€/Monat starten
            </Button>
            <Button onClick={onOpenReport} variant={isPremium ? "outline" : "default"} size="lg" className={!isPremium ? "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30" : ""}>
              {isPremium ? <FileText className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />} 
              {isPremium ? 'Audit-Bericht (PDF)' : 'Basis-Report (Kostenlos)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RemediationModal 
        isOpen={!!remediationIssue} 
        onClose={() => setRemediationIssue(null)}
        issueTitle={remediationIssue?.title || ''}
        codeSnippet={remediationIssue?.codeSnippet}
        affectedElement={remediationIssue?.affectedElement}
      />
    </div>
  );
};

