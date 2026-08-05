import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Bot, GitPullRequest, GitBranch, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueTitle: string;
  codeSnippet?: string;
  affectedElement?: string;
}

export const RemediationModal: React.FC<RemediationModalProps> = ({
  isOpen,
  onClose,
  issueTitle,
  codeSnippet,
  affectedElement
}) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      // Simulate AI workflow
      const t1 = setTimeout(() => setStep(1), 1500);
      const t2 = setTimeout(() => setStep(2), 3500);
      const t3 = setTimeout(() => setStep(3), 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bot className="w-6 h-6 text-primary" /> Autonomous Remediation AI
          </DialogTitle>
          <DialogDescription>
            Die KI analysiert das Problem "{issueTitle}" und generiert einen sicheren Fix für Ihre Codebase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Analyze */}
          <div className={`flex items-start gap-4 transition-opacity duration-500 ${step >= 0 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="mt-1">
              {step > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
            </div>
            <div>
              <h4 className="font-semibold text-sm">1. Repository Scan & Kontext-Analyse</h4>
              <p className="text-xs text-muted-foreground mt-1">Lokalisiere betroffene Komponente <code className="bg-muted px-1 rounded">{affectedElement || 'index.html'}</code> im verbundenen GitHub-Repository.</p>
            </div>
          </div>

          {/* Step 2: Generate Code */}
          <div className={`flex items-start gap-4 transition-opacity duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="mt-1">
              {step > 1 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : (step === 1 ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-muted" />)}
            </div>
            <div className="w-full">
              <h4 className="font-semibold text-sm">2. Generiere AST-sicheren Patch</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-2">Erzeuge den Fix-Code auf Basis der Enterprise-Vorlagen.</p>
              
              <div className={`overflow-hidden transition-all duration-500 ${step >= 1 ? 'max-h-40' : 'max-h-0'}`}>
                <pre className="p-3 bg-zinc-950 rounded-lg text-[10px] font-mono text-zinc-300 border border-zinc-800">
                  <code className="text-emerald-400">+ // Added by Compliance OS Auto-Fix</code>{'\n'}
                  <code>{codeSnippet || '<div className="ai-disclaimer">...</div>'}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Step 3: Open PR */}
          <div className={`flex items-start gap-4 transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="mt-1">
              {step > 2 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : (step === 2 ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-muted" />)}
            </div>
            <div>
              <h4 className="font-semibold text-sm">3. GitHub Pull Request erstellen</h4>
              <div className={`mt-2 flex items-center gap-2 text-xs transition-all duration-500 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <Badge variant="outline" className="font-mono bg-muted"><GitBranch className="w-3 h-3 mr-1"/> fix/compliance-{Math.floor(Math.random() * 1000)}</Badge>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <Badge variant="outline" className="font-mono"><GitBranch className="w-3 h-3 mr-1"/> main</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Schließen</Button>
          <Button 
            disabled={step < 3} 
            className="gap-2"
            onClick={() => {
              window.open('https://github.com', '_blank');
              onClose();
            }}
          >
            <GitPullRequest className="w-4 h-4" /> 
            {step < 3 ? 'Generiere Fix...' : 'PR auf GitHub ansehen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
