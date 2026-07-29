import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, ShieldCheck, Zap, Server, Lock } from 'lucide-react';
import { CheckoutSimulation } from './CheckoutSimulation';

interface PricingModalProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onClose?: () => void;
}

export function PricingModal({ isPremium, onUpgrade, onClose }: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string} | null>(null);

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
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Sichern Sie Ihre Infrastruktur ab.</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Wählen Sie das passende Audit-Paket, um teure Abmahnungen und DSGVO-Strafen zu vermeiden.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Tier 1: Einmal-Audit */}
        <Card className="flex flex-col border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Einmal-Audit</CardTitle>
            <CardDescription>Perfekt für einen sofortigen Sicherheits-Check.</CardDescription>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              49€
              <span className="ml-1 text-xl font-medium text-muted-foreground">/einmalig</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              {[
                'Vollständiger PDF-Report inkl. aller Befunde',
                'Code-Snippets für SAST/DAST Fixes',
                'Unternehmensregister-Validierung',
                'Dark Pattern & UX Analyse',
                'E-Mail Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full text-lg h-12 font-bold" 
              variant="outline"
              onClick={() => setSelectedPlan({name: 'Einmal-Audit', price: '49,00 €'})}
            >
              Jetzt freischalten
            </Button>
          </CardFooter>
        </Card>

        {/* Tier 2: Monitoring (Pro) */}
        <Card className="flex flex-col border-primary shadow-2xl shadow-primary/10 relative scale-105 z-10 bg-gradient-to-b from-card to-primary/5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Meistgewählt
          </div>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Dauer-Monitoring
            </CardTitle>
            <CardDescription>Für Agenturen und SaaS-Unternehmen, die 100% sicher bleiben wollen.</CardDescription>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              199€
              <span className="ml-1 text-xl font-medium text-muted-foreground">/Monat</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              {[
                'Alles aus dem Einmal-Audit',
                'Wöchentlicher automatischer Deep-Scan',
                'API-Schutz & CI/CD Integration',
                'BSI-Zertifikat für Ihre Website',
                'Persönlicher Legal-Tech Consultant'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full text-lg h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setSelectedPlan({name: 'Dauer-Monitoring', price: '199,00 €'})}
            >
              <Zap className="w-5 h-5 mr-2" /> Abo starten
            </Button>
          </CardFooter>
        </Card>

      </div>
      
      <div className="mt-12 text-center flex items-center justify-center gap-6 text-muted-foreground text-sm">
        <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Sichere Zahlung</span>
        <span className="flex items-center gap-2"><Server className="w-4 h-4" /> ISO 27001 Hosting</span>
      </div>
    </div>
  );
}
