import { ArrowLeft, Construction, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface FeaturePreviewProps {
  title: string;
  description: string;
  plannedCapabilities: string[];
  onBack: () => void;
}

export function FeaturePreview({
  title,
  description,
  plannedCapabilities,
  onBack,
}: FeaturePreviewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="border-primary/20 bg-card/60">
        <CardContent className="p-7 md:p-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Construction className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <Badge variant="secondary">Prototype / Preview</Badge>
              <h1 className="text-2xl md:text-3xl font-bold mt-4">{title}</h1>
              <p className="text-muted-foreground mt-3 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-muted/20 p-5">
            <h2 className="font-semibold">Geplanter produktiver Umfang</h2>
            <ul className="mt-4 space-y-3">
              {plannedCapabilities.map((capability) => (
                <li key={capability} className="flex gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-muted-foreground">
            Diese Oberfläche ist im Repository als Produktdesign vorhanden, aber GuardAI stellt sie erst als reale Funktion bereit,
            wenn Backend, Datenmodell, Berechtigungen, Tests und Security dafür implementiert sind.
          </div>

          <Button variant="outline" onClick={onBack} className="mt-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zum Scanner
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
