import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, ShieldCheck, Server, Lock } from 'lucide-react';
import { CheckoutSimulation } from './CheckoutSimulation';

interface PricingModalProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onClose?: () => void;
}

export function PricingModal({ isPremium, onUpgrade, onClose }: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string} | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  if (isPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-extrabold">Du bist bereits Pro-Nutzer!</h2>
        <p className="text-xl text-muted-foreground max-w-xl">
          Dein Account ist aktiv. Du hast vollen Zugriff auf alle tiefen Scans, Code-Snippets und PDF-Berichte.
        </p>
        <Button onClick={onClose} size="lg">Zurück zum Dashboard</Button>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <CheckoutSimulation 
        planName={selectedPlan.name}
        price={selectedPlan.price}
        onClose={() => setSelectedPlan(null)}
        onSuccess={() => {
          onUpgrade();
          if (onClose) onClose();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-10 space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Sichern Sie Ihre Infrastruktur ab.</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Wählen Sie das passende Audit-Paket, um teure Abmahnungen und DSGVO-Strafen zu vermeiden.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-muted p-1 rounded-full inline-flex items-center relative">
          <button
            onClick={() => setIsAnnual(false)}
            className={`relative w-32 py-2 text-sm font-medium rounded-full transition-all duration-300 z-10 ${
              !isAnnual ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`relative w-32 py-2 text-sm font-medium rounded-full transition-all duration-300 z-10 ${
              isAnnual ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Jährlich
            <span className="absolute -top-3 -right-6 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              Spar 20%
            </span>
          </button>
          {/* Animated Highlight Background */}
          <div
            className="absolute top-1 bottom-1 w-32 bg-background rounded-full shadow-sm transition-transform duration-300 ease-in-out z-0"
            style={{ transform: `translateX(${isAnnual ? '100%' : '0'})` }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        
        {/* Tier 0: Free */}
        <Card className="flex flex-col border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>Basis-Scan für kleine Websites.</CardDescription>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              0€
              <span className="ml-1 text-xl font-medium text-muted-foreground">/Monat</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              {[
                '1 Website Scan pro Woche',
                'Overall Compliance Score',
                'Eingeschränktes Dashboard',
                'Kritische Fehler (ohne Lösung)',
                'Community Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>Aktueller Plan</Button>
          </CardFooter>
        </Card>

        {/* Tier 1: Pro (Solo) */}
        <Card className="flex flex-col border-primary ring-2 ring-primary relative bg-primary/5 scale-105 shadow-xl z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Beliebt
            </span>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Pro (Solo)</CardTitle>
            <CardDescription>Für Freelancer & Einzelgründer.</CardDescription>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
              {isAnnual ? '24€' : '29€'}
              <span className="ml-1 text-xl font-medium text-muted-foreground">/Monat</span>
            </div>
            {isAnnual && (
              <p className="text-sm text-muted-foreground mt-2">Jährliche Abrechnung (288€/Jahr)</p>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              {[
                'Unbegrenzte Scans',
                '1-Click Legal Docs (AVV, AI Act)',
                'Auto-Fix Code Snippets',
                'Public Trust Center Badge',
                'Live-Monitoring & E-Mail Alerts',
                'Premium Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setSelectedPlan({ name: 'Pro (Solo)', price: isAnnual ? '24' : '29' })} className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20">Jetzt Upgraden</Button>
          </CardFooter>
        </Card>

        {/* Tier 2: Business (Team) */}
        <Card className="flex flex-col border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Business (Team)</CardTitle>
            <CardDescription>Für Agenturen & Teams.</CardDescription>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              {isAnnual ? '79€' : '99€'}
              <span className="ml-1 text-xl font-medium text-muted-foreground">/Monat</span>
            </div>
            {isAnnual && (
              <p className="text-sm text-muted-foreground mt-2">Jährliche Abrechnung (948€/Jahr)</p>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              {[
                'Bis zu 10 Team-Mitglieder',
                'Mandantenfähiges Dashboard',
                'Slack & MS Teams Integration',
                'Jira & GitHub Auto-Fix PRs',
                'White-Label PDF Reports',
                'Dedicated Success Manager'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setSelectedPlan({ name: 'Business (Team)', price: isAnnual ? '79' : '99' })} variant="outline" className="w-full h-11">Team-Plan wählen</Button>
          </CardFooter>
        </Card>

      </div>
      
      <div className="mt-16 text-center flex items-center justify-center gap-6 text-muted-foreground text-sm">
        <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Sichere Zahlung</span>
        <span className="flex items-center gap-2"><Server className="w-4 h-4" /> ISO 27001 Hosting in Deutschland</span>
      </div>
    </div>
  );
}
