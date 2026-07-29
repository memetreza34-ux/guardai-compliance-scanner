import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { ScanProgressStep } from '../types/scanner';

interface ScanProgressModalProps {
  url: string;
  onComplete: () => void;
}

export const ScanProgressModal: React.FC<ScanProgressModalProps> = ({ url, onComplete }) => {
  const [progress, setProgress] = useState(0);

  const steps: ScanProgressStep[] = [
    { id: 1, message: `Initialisiere Deep-Crawler für ${url}...`, status: 'running', timestamp: '0.1s' },
    { id: 2, message: 'Parse Javascript Bundles & extrahiere Source Code (SAST/DAST)...', status: 'pending', timestamp: '0.8s' },
    { id: 3, message: 'Analysiere Abhängigkeiten & API Endpoints auf Schatten-KI...', status: 'pending', timestamp: '1.2s' },
    { id: 4, message: 'Extrahiere Impressum & vergleiche Unternehmensdaten mit Handelsregister...', status: 'pending', timestamp: '1.8s' },
    { id: 5, message: 'Scanne Third-Party Cookies & Pre-Consent Datenabflüsse (DSGVO Art. 6)...', status: 'pending', timestamp: '2.5s' },
    { id: 6, message: 'Evaluiere Transparenzkennzeichnung gemäß EU AI Act Art. 50 (1)...', status: 'pending', timestamp: '3.1s' },
    { id: 7, message: 'Analysiere WCAG 2.1 Barrierefreiheit & TLS 1.3 Verschlüsselung...', status: 'pending', timestamp: '3.6s' },
    { id: 8, message: 'Generiere Enterprise Audit Dossier & berechne Risk Score...', status: 'pending', timestamp: '4.2s' }
  ];

  const [activeSteps, setActiveSteps] = useState(steps);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }

        const next = prev + 15;
        const newStepIndex = Math.min(Math.floor((next / 100) * steps.length), steps.length - 1);

        setActiveSteps(steps.map((step, idx) => {
          if (idx < newStepIndex) return { ...step, status: 'completed' };
          if (idx === newStepIndex) return { ...step, status: 'running' };
          return { ...step, status: 'pending' };
        }));

        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="panel-card max-w-xl w-full p-6 border-indigo-500/30"
      >
        {/* Terminal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">GuardAI Deep Compliance Scan</h2>
            <p className="text-xs text-gray-400">Analysiere: <span className="font-mono text-cyan-400">{url}</span></p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-gray-300">Scan-Fortschritt</span>
            <span className="text-indigo-400">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        </div>

        {/* Console Log Output */}
        <div className="code-block-styled p-4 h-60 overflow-y-auto space-y-2 text-xs">
          {activeSteps.map((step) => (
            <div 
              key={step.id} 
              className={`flex items-start gap-2 transition-opacity ${step.status === 'pending' ? 'opacity-30' : 'opacity-100'}`}
            >
              <span className="text-gray-500 text-[10px] min-w-[32px] pt-0.5">{step.timestamp}</span>
              {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {step.status === 'running' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" />}
              {step.status === 'pending' && <span className="w-3.5 h-3.5 rounded-full border border-gray-600 inline-block shrink-0 mt-0.5" />}
              <span className={step.status === 'running' ? 'text-white font-medium' : step.status === 'completed' ? 'text-gray-300' : 'text-gray-500'}>
                {step.message}
              </span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> GuardAI Crawler Engine v2.6
          </span>
          <span>Analysiere EU AI Act & DSGVO Parameter</span>
        </div>
      </motion.div>
    </div>
  );
};
