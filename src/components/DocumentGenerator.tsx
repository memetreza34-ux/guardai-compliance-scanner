import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Scale, FileSignature, Users, CheckCircle2, Lock, FileKey, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { ScanResult } from '../types/scanner';

interface DocumentGeneratorProps {
  scanResult?: ScanResult | null;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ isPremium, onUpgrade }) => {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (docId: string) => {
    if (!isPremium) {
      if (onUpgrade) onUpgrade();
      return;
    }

    setGenerating(docId);
    setTimeout(() => {
      setGenerating(null);
      // Simulate file download
      const link = document.createElement('a');
      link.href = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgkJL0YyIDUgMCBSCgkJL0YzIDYgMCBSCiAgICA+PgogID4+CiAgL0NvbnRlbnRzIDcgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtQm9sZAo+PgplbmRvYmoKCjYgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNyAwIG9iago8PAogIC9MZW5ndGggMTc5Cj4+CnN0cmVhbQpCVEQKL0YzIDI0IFRmCjI1IDEwMCBUZAooRG9jdW1lbnQgR2VuZXJhdGVkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTkgMDAwMDAgbiAKMDAwMDAwMDE1MiAwMDAwMCBuIAowMDAwMDAwMjg4IDAwMDAwIG4gCjAwMDAwMDAzNzYgMDAwMDAgbiAKMDAwMDAwMDQ2MiAwMDAwMCBuIAowMDAwMDAwNTUwIDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA4CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjc4MAolJUVPRgo=';
      link.download = `${docId}_GuardAI.pdf`;
      link.click();
    }, 2000);
  };

  const docs = [
    {
      id: 'avv',
      title: 'AV-Verträge (Auftragsverarbeitung)',
      description: 'Automatisch generierte DSGVO-Verträge für deine erkannten Sub-Processoren (OpenAI, Vercel, AWS).',
      icon: <FileSignature className="w-8 h-8 text-indigo-500" />,
      color: 'indigo'
    },
    {
      id: 'annex-iv',
      title: 'EU AI Act Technical Documentation',
      description: 'Erstellt automatisch das "Annex IV" Pflichtdokument für Transparenz und Risikomanagement.',
      icon: <FileText className="w-8 h-8 text-emerald-500" />,
      color: 'emerald'
    },
    {
      id: 'privacy',
      title: 'Dynamische Datenschutzerklärung',
      description: 'Passt sich in Echtzeit an, wenn dein Team neue Marketing-Tracker oder KI-Dienste installiert.',
      icon: <Scale className="w-8 h-8 text-cyan-500" />,
      color: 'cyan'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">
          <Scale className="w-3.5 h-3.5 mr-1" /> Legal Automation (Smart Documents)
        </Badge>
        <h2 className="text-3xl font-extrabold tracking-tight">Ersetze Anwaltskosten durch Automatisierung</h2>
        <p className="text-muted-foreground">
          Unser System weiß durch den Scan genau, welche Daten du verarbeitest. Spare tausende Euro für Anwälte und generiere rechtsgültige Dokumente mit einem Klick.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {docs.map((doc) => (
          <Card key={doc.id} className="relative overflow-hidden group hover:shadow-xl transition-all border-border">
            <CardHeader>
              <div className={`w-16 h-16 rounded-2xl bg-${doc.color}-500/10 flex items-center justify-center mb-4`}>
                {doc.icon}
              </div>
              <CardTitle className="text-xl">{doc.title}</CardTitle>
              <CardDescription className="min-h-[60px]">{doc.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                onClick={() => handleGenerate(doc.id)}
                disabled={generating === doc.id}
                className="w-full"
                variant={isPremium ? 'default' : 'secondary'}
              >
                {generating === doc.id ? (
                  <span className="flex items-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="mr-2">
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                    Generiere PDF...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Download className="w-4 h-4 mr-2" /> 
                    {isPremium ? 'Dokument Generieren' : 'Freischalten (Pro)'}
                    {!isPremium && <Lock className="w-3 h-3 ml-2 opacity-70" />}
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="pt-8">
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <Users className="w-64 h-64" />
          </div>
          <CardContent className="p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="flex-1 space-y-4">
              <Badge variant="outline" className="border-cyan-400 text-cyan-400">Neues Feature (Q3 2026)</Badge>
              <h3 className="text-2xl font-bold">DSAR-Portal (Data Subject Access Request)</h3>
              <p className="text-slate-300 max-w-2xl">
                Lass uns die lästigen "Bitte löschen Sie alle meine Daten" E-Mails übernehmen. Mit einem Klick erhältst du ein White-Label-Portal, über das deine Nutzer DSGVO-Anfragen stellen können. Wir verifizieren die Identität und übermitteln dir die strukturierte Anfrage.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-300 pt-2">
                <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-cyan-400" /> Identitätsprüfung (ID-Auth)</li>
                <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-cyan-400" /> Fristen-Überwachung (30 Tage)</li>
                <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-cyan-400" /> Automatischer Datenexport</li>
                <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-cyan-400" /> Lösch-Protokollierung</li>
              </ul>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <Button size="lg" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold" onClick={() => { if(!isPremium && onUpgrade) onUpgrade(); }}>
                <FileKey className="w-5 h-5 mr-2" /> Portal Einrichten {isPremium ? '' : '(Pro)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
