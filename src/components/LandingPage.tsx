import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Eye,
  FileSearch,
  GitBranch,
  Lock,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react';
import { UrlInputHero } from './UrlInputHero';
import type { ScanOptions } from '../types/scanOptions';

interface LandingPageProps {
  onStartScan: (target: string | File, options: ScanOptions) => void | Promise<void>;
  isScanning: boolean;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={open}
      >
        <span className="font-semibold text-base group-hover:text-primary transition-colors">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="pb-5 text-muted-foreground text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onStartScan, isScanning }: LandingPageProps) {
  const featureCards = [
    {
      icon: Lock,
      title: 'Security Evidence',
      description: 'Technische Hinweise aus tatsächlich ausgeführten Security-Checks statt pauschaler Sicherheitsversprechen.',
    },
    {
      icon: SearchCheck,
      title: 'Privacy Evidence',
      description: 'Der Ausbau zielt auf beobachtbare Cookies, Requests, Storage und Consent-Verhalten im Browser.',
    },
    {
      icon: Eye,
      title: 'Accessibility',
      description: 'Automatisierte Accessibility-Checks werden als Teilabdeckung dargestellt und nicht mit manueller Prüfung verwechselt.',
    },
    {
      icon: Bot,
      title: 'AI Governance',
      description: 'AI-bezogene Evidenz und geführte Prüfung statt automatischer Behauptung vollständiger EU-AI-Act-Konformität.',
    },
    {
      icon: GitBranch,
      title: 'Repository Analysis',
      description: 'Geplant sind nachvollziehbare Dependency-, Secret-, SAST- und Supply-Chain-Findings mit Datei- und Versionsbezug.',
    },
    {
      icon: FileSearch,
      title: 'Evidence-first Reports',
      description: 'Berichte sollen aus gespeicherten Findings, Evidence und Scanner-Versionen entstehen — nicht aus statischen Demo-Texten.',
    },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <UrlInputHero onStartScan={onStartScan} isScanning={isScanning} />

      <section className="py-14 border-y border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border bg-card/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg">1. Target erfassen</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Website, Repository oder unterstützte Datei auswählen. GuardAI trennt künftig unterschiedliche Scanner-Pipelines sauber voneinander.
              </p>
            </div>

            <div className="rounded-2xl border bg-card/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <SearchCheck className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg">2. Technische Checks ausführen</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Nur ausgeführte Detectoren zählen. Fehlende Checks werden als nicht bewertet angezeigt und nicht künstlich als bestanden gewertet.
              </p>
            </div>

            <div className="rounded-2xl border bg-card/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <FileSearch className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg">3. Findings nachvollziehen</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Zielbild sind Findings mit Evidence, Severity, Confidence, Rule-Version und Remediation statt einer nicht erklärbaren Ampel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">GuardAI Product Direction</p>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Was wir aus dem Prototype bauen</h2>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            Die Oberfläche ist bereits weit entwickelt. Jetzt wird jede wichtige Produktfläche schrittweise mit echter Scanner-Technik,
            Backend-Zustand, Security, Persistenz und Tests verbunden.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border bg-card/40 p-6 hover:bg-card/70 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg mt-5">{title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">Aktueller Status</p>
            <h2 className="text-3xl font-extrabold mt-3">Prototype mit aktivem Production-Rebuild</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              GuardAI ist noch keine fertige Compliance-Plattform. Einige bestehende Module sind Demo-/Preview-Flächen und werden erst dann
              als reale Produktfunktion behandelt, wenn Backend, Datenmodell, Tests und Security dazu existieren.
            </p>

            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Keine Rechts- oder Sicherheitsgarantie</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Automatisierte technische Checks können Risiken sichtbar machen, ersetzen aber weder eine vollständige manuelle Prüfung noch Rechtsberatung oder einen Penetrationstest.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-bold">Was im Rebuild priorisiert wird</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Gemeinsame Frontend-/Backend-Contracts</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Sichere URL- und Upload-Grenzen</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Echte Evidence statt Mock-Resultate</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Auth, Workspaces und Tenant-Isolation</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Persistenz, Queue/Worker und Monitoring</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Tests, CI/CD und reproduzierbares Deployment</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold">Häufige Fragen</h2>
          <p className="text-muted-foreground mt-3">Zum aktuellen GuardAI-Produktstatus.</p>
        </div>

        <div className="rounded-2xl border bg-card/40 px-6">
          <FaqItem
            question="Ist GuardAI bereits eine fertige Compliance-Zertifizierung?"
            answer="Nein. GuardAI wird als technische Evidence- und Risk-Screening-Plattform aufgebaut. Ein automatisierter Scan ist keine offizielle Zertifizierung und keine Garantie rechtlicher Konformität."
          />
          <FaqItem
            question="Warum zeigt GuardAI manche Bereiche als nicht bewertet?"
            answer="Weil fehlende oder nicht ausgeführte Checks nicht als bestanden dargestellt werden sollen. Coverage und Ergebnis müssen getrennt bleiben."
          />
          <FaqItem
            question="Welche Scanner sollen im MVP real werden?"
            answer="Priorisiert sind technische Web-Security-Checks, Privacy-/Browser-Evidence, Accessibility, geführte AI-Governance-Evidence sowie Repository-Checks für Dependencies, Secrets und SAST-Basis."
          />
          <FaqItem
            question="Was passiert mit AI Counsel, Trust Center und TrueSight?"
            answer="Diese Oberflächen bleiben Teil der Produktvision, werden aber erst dann als echte Funktion freigeschaltet, wenn ihre Daten- und Modellgrundlage real, getestet und nachvollziehbar ist."
          />
        </div>
      </section>
    </div>
  );
}
