import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Bot, Scale, Copyright, Eye, Copy, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';

type Category = 'ai-act' | 'ip-rights' | 'gdpr';

interface Template {
  id: string;
  title: string;
  description: string;
  context: string;
  law: string;
  snippet: string;
  type: 'html' | 'text' | 'markdown';
}

const TEMPLATES: Record<Category, Template[]> = {
  'ai-act': [
    {
      id: 'ai-chatbot-disclaimer',
      title: 'Chatbot Transparenz-Hinweis (Art. 50)',
      description: 'Pflicht-Disclaimer für KI-Chatbots und virtuelle Assistenten.',
      context: 'Muss dauerhaft und gut sichtbar im Chat-Fenster (Header oder Intro-Nachricht) platziert werden, bevor der Nutzer interagiert.',
      law: 'EU AI Act — Artikel 50 (1)',
      type: 'html',
      snippet: `<div class="ai-disclaimer" style="font-size: 0.8rem; color: #666; padding: 8px; background: #f0f0f0; border-radius: 4px; margin-bottom: 12px;">
  <strong>🤖 KI-generierte Inhalte:</strong> Sie kommunizieren mit einem automatisierten KI-System. Die Antworten werden maschinell erzeugt und können Fehler enthalten. Bitte teilen Sie keine sensiblen oder personenbezogenen Daten.
</div>`
    },
    {
      id: 'ai-deepfake-watermark',
      title: 'Deepfake & KI-Bilder Kennzeichnung',
      description: 'Sichtbares Wasserzeichen und Hinweis für fotorealistische KI-Bilder oder Videos.',
      context: 'Wird unter dem Bild oder als Overlay eingefügt, wenn Bilder durch KI erzeugt oder signifikant manipuliert wurden.',
      law: 'EU AI Act — Artikel 50 (2)',
      type: 'text',
      snippet: `Bildquelle: Maschinell generiert durch ein KI-System. (Zusätzlich wird die Einbettung von C2PA Content Credentials in die Metadaten empfohlen).`
    }
  ],
  'ip-rights': [
    {
      id: 'ip-presentation-disclaimer',
      title: 'IP & Urheberrecht für Präsentationen (B2B)',
      description: 'Haftungsausschluss und Urheberrechtshinweis für digitale Produkte wie Präsentationen und Flyer.',
      context: 'Auf der ersten oder zweiten Folie (bzw. Seite) des Dokuments zu platzieren.',
      law: 'Urheberrechtsgesetz (UrhG) § 15',
      type: 'text',
      snippet: `© [JAHR] [Unternehmensname]. Alle Rechte vorbehalten. 
Dieses Dokument und seine Inhalte sind geistiges Eigentum von [Unternehmensname]. Jede Vervielfältigung, Weitergabe oder kommerzielle Nutzung – auch auszugsweise – bedarf der vorherigen schriftlichen Zustimmung. Sofern Teile dieses Dokuments mit KI-Tools erstellt wurden, übernehmen wir keine Haftung für deren vollständige inhaltliche Richtigkeit.`
    }
  ],
  'gdpr': [
    {
      id: 'gdpr-ai-training-optin',
      title: 'Opt-in für KI-Training mit Nutzerdaten',
      description: 'Einwilligungsklausel zur Nutzung von Kundendaten für das Training eigener oder fremder KI-Modelle.',
      context: 'Muss als Checkbox (Opt-in) beim Registrierungsprozess oder in den Profileinstellungen integriert werden.',
      law: 'DSGVO Art. 6 (1) lit. a, Art. 13',
      type: 'html',
      snippet: `<label style="display: flex; gap: 8px; align-items: flex-start;">
  <input type="checkbox" name="ai_training_consent" required />
  <span>Ich willige ein, dass meine Eingabedaten und mein Nutzungsverhalten anonymisiert zur Verbesserung und zum Training von KI-Modellen durch [Unternehmensname] genutzt werden dürfen. Diese Einwilligung kann jederzeit in den Datenschutzeinstellungen widerrufen werden. Weitere Details finden Sie in der <a href="/datenschutz">Datenschutzerklärung</a>.</span>
</label>`
    }
  ]
};

export const TemplatesHub: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('ai-act');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { id: 'ai-act' as const, label: 'EU AI Act', icon: Bot },
    { id: 'ip-rights' as const, label: 'Urheberrecht & IP', icon: Copyright },
    { id: 'gdpr' as const, label: 'DSGVO & Privacy', icon: Scale },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Vorlagen & Leitfäden</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Rechtssichere Text-Bausteine und Code-Snippets für Ihr Unternehmen. Kopieren Sie die Vorlagen direkt in Ihr Projekt, um Bußgelder nach EU AI Act, UrhG und DSGVO zu vermeiden.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold transition-all ${
                activeCategory === cat.id 
                  ? 'bg-muted text-foreground border-b-2 border-primary' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {TEMPLATES[activeCategory].map((template) => (
          <Card key={template.id} className="border-muted shadow-sm">
            <CardHeader className="pb-3 border-b border-muted/30 bg-muted/10">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg font-bold">{template.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono tracking-wider">
                      {template.type.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
                <div className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {template.law}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3 text-sm bg-accent/50 p-3 rounded-lg border border-border">
                <Eye className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Kontext & Platzierung:</strong>
                  <span className="text-muted-foreground">{template.context}</span>
                </div>
              </div>

              <div className="relative group mt-4">
                <div className="absolute right-2 top-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="h-8 shadow-sm"
                    onClick={() => handleCopy(template.id, template.snippet)}
                  >
                    {copiedId === template.id ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Kopiert</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1.5" /> Kopieren</>
                    )}
                  </Button>
                </div>
                <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-50 border border-zinc-800 overflow-x-auto text-sm font-mono shadow-inner">
                  <code>{template.snippet}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
