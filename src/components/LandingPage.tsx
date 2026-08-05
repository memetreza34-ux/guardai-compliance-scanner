import { useState } from 'react';
import { UrlInputHero } from './UrlInputHero';
import { ShieldAlert, AlertTriangle, ServerCrash, Eye, Bot, FileCheck, Lock, Sparkles, ChevronDown, Building2 } from 'lucide-react';

interface LandingPageProps {
  onStartScan: (url: string | File, options: any) => void;
  isScanning: boolean;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-semibold text-base group-hover:text-primary transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '200px' : '0', opacity: open ? 1 : 0 }}
      >
        <p className="pb-5 text-muted-foreground text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function LandingPage({ onStartScan, isScanning }: LandingPageProps) {
  return (
    <div className="animate-in fade-in duration-700">
      {/* 1. Hero Section with Scanner */}
      <UrlInputHero onStartScan={onStartScan} isScanning={isScanning} />

      {/* 2. How it works / Intro (Einleitung) */}
      <div className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">In 3 einfachen Schritten zur Compliance</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Unser System nimmt dir die manuelle rechtliche Prüfung ab. Vollautomatisiert und immer auf dem neuesten Stand der Gesetze.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl mb-4">1</div>
              <h3 className="font-bold mb-2">URL eingeben</h3>
              <p className="text-sm text-muted-foreground">Gib einfach die Domain deiner App oder Website in den Scanner ein. Keine Code-Integration nötig.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl mb-4">2</div>
              <h3 className="font-bold mb-2">KI-Analyse läuft</h3>
              <p className="text-sm text-muted-foreground">Unsere autonomen Agenten prüfen DSGVO, AI Act, ESG & mehr in Echtzeit.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl mb-4">3</div>
              <h3 className="font-bold mb-2">Report & Zertifikat</h3>
              <p className="text-sm text-muted-foreground">Erhalte 1-Click Fixes für Fehler und ein Trust-Badge für deine konforme Seite.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Features Deep Dive */}
      <div className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Was unsere Engine erkennt.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            GuardAI kombiniert rechtliches Fachwissen mit autonomer KI-Analyse. Keine Checkliste – ein lebendes System.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <Eye className="w-6 h-6" />, title: 'Dark Pattern Erkennung', desc: 'Identifiziert irreführende UI-Muster wie manipulative Cookie-Banner, Hidden Costs und Trick Questions.', color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
            { icon: <Lock className="w-6 h-6" />, title: 'DSGVO & Cookie Scanner', desc: 'Prüft Cookie-Consent-Flows, Datenschutzerklärungen, Auftragsverarbeitungsverträge und Third-Party Tracker.', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { icon: <Bot className="w-6 h-6" />, title: 'EU AI Act Compliance', desc: 'Erkennt fehlende KI-Transparenzpflichten (Art. 50), Risikoklassifizierung und Dokumentationslücken.', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { icon: <ShieldAlert className="w-6 h-6" />, title: 'Security Audit (OWASP)', desc: 'Scannt auf XSS, SQL Injection, veraltete Libraries, unsichere HTTP-Header und Prototype Pollution.', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            { icon: <FileCheck className="w-6 h-6" />, title: 'Barrierefreiheit (WCAG)', desc: 'Prüft Kontrastverhältnisse, ARIA-Labels, Keyboard-Navigation und Screen-Reader-Kompatibilität.', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { icon: <Sparkles className="w-6 h-6" />, title: 'ESG & Nachhaltigkeitsreport', desc: 'Bewertet CO₂-Fußabdruck, Green Hosting, CSRD-Berichtspflichten und nachhaltige UX-Praktiken.', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          ].map((feature, i) => (
            <div key={i} className={`${feature.bg} border ${feature.border} p-8 rounded-2xl hover:scale-[1.02] transition-transform duration-300`}>
              <div className={`w-12 h-12 ${feature.bg} ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. The "Pain" / Fear Section */}
      <div className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Warum ein manuelles Audit nicht mehr reicht.</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Abmahnwellen durch den neuen EU AI Act und automatisierte DSGVO-Crawler bedrohen ungesicherte Webanwendungen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-destructive/5 border border-destructive/20 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-xl flex items-center justify-center mb-6">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">EU AI Act Strafen</h3>
              <p className="text-muted-foreground">
                Fehlende Transparenz bei KI-Systemen (Art. 50) kann Strafen von bis zu 35 Millionen Euro oder 7% des weltweiten Jahresumsatzes nach sich ziehen.
              </p>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Abmahnwellen</h3>
              <p className="text-muted-foreground">
                Automatisierte Kanzlei-Bots scannen massenhaft nach fehlenden Kündigungsbuttons (BGB) und fehlerhaften Cookie-Bannern.
              </p>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <ServerCrash className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Supply-Chain Attacks</h3>
              <p className="text-muted-foreground">
                Veraltete Frontend-Libraries (React, jQuery) sind das Haupteinfallstor für XSS und Prototype Pollution in SaaS-Plattformen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Social Proof / Logos */}
      <div className="py-12 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
            Vertraut von Legal-Teams und Agenturen weltweit
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
            <div className="flex items-center gap-2 font-bold text-xl"><Building2 className="w-6 h-6" /> Acme Corp</div>
            <div className="flex items-center gap-2 font-black text-xl tracking-tighter">TECH<span className="text-primary">GUARD</span></div>
            <div className="flex items-center gap-2 font-serif text-xl font-bold italic">Lex Consult</div>
            <div className="flex items-center gap-2 font-mono text-xl">./sec_ops</div>
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide">DATA<span className="text-emerald-500">SHIELD</span></div>
          </div>
        </div>
      </div>

      {/* 6. FAQ Section */}
      <div className="py-24 max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Häufig gestellte Fragen</h2>
          <p className="text-muted-foreground">Alles, was du vor dem Start wissen musst.</p>
        </div>

        <div className="border border-border rounded-2xl px-6 bg-card">
          <FaqItem
            question="Ersetzt GuardAI einen echten Anwalt?"
            answer="GuardAI ersetzt keine individuelle Rechtsberatung. Unser System identifiziert und priorisiert potenzielle Compliance-Verstöße automatisiert, liefert Code-Fixes und generiert rechtskonforme Vorlagen. Für komplexe Einzelfälle empfehlen wir die Zusammenarbeit mit einer spezialisierten Kanzlei – unser AI Counsel kann dabei als Vorarbeit genutzt werden."
          />
          <FaqItem
            question="Wie oft wird meine Website gescannt?"
            answer="Im Free-Plan kannst du 1 Scan pro Woche durchführen. Im Pro-Plan sind unbegrenzte Scans enthalten, inklusive 24/7 Live-Monitoring. Sobald sich etwas ändert (z.B. ein neuer Tracker wird eingebaut), wirst du sofort per E-Mail oder Slack benachrichtigt."
          />
          <FaqItem
            question="Was passiert, wenn ein neues Gesetz in Kraft tritt?"
            answer="Unsere KI-Agenten synchronisieren sich täglich mit den aktuellen Rechtsquellen (EU-Amtsblatt, BSI, BfDI). Sobald ein neues Gesetz oder eine Verordnung relevant wird, erhältst du proaktiv eine Warnung mit konkreten Handlungsempfehlungen – noch bevor die meisten Anwaltskanzleien reagieren."
          />
          <FaqItem
            question="Welche Daten werden bei einem Scan erhoben?"
            answer="Wir analysieren ausschließlich die öffentlich zugängliche Oberfläche deiner Website (HTML, CSS, JS, HTTP-Header). Es werden keine personenbezogenen Nutzerdaten deiner Besucher erhoben. Alle Scan-Ergebnisse werden verschlüsselt auf ISO-27001-zertifizierten Servern in Deutschland gespeichert."
          />
          <FaqItem
            question="Kann ich GuardAI in meine CI/CD-Pipeline integrieren?"
            answer="Ja! Im Business-Plan erhältst du API-Keys und Webhook-Endpoints, die du direkt in GitHub Actions, GitLab CI oder Bitbucket Pipelines einbinden kannst. So wird bei jedem Deployment automatisch ein Compliance-Check ausgeführt."
          />
          <FaqItem
            question="Gibt es eine Geld-zurück-Garantie?"
            answer="Ja, wir bieten eine 14-tägige Geld-zurück-Garantie auf alle kostenpflichtigen Pläne. Wenn du nicht zufrieden bist, erstatten wir dir den vollen Betrag – ohne Fragen."
          />
        </div>
      </div>
    </div>
  );
}
