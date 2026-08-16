import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Server, ShieldCheck, Database } from 'lucide-react';

interface ScanProgressModalProps {
  url: string;
}

export const ScanProgressModal: React.FC<ScanProgressModalProps> = ({ url }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="panel-card max-w-xl w-full p-6 border-indigo-500/30"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">GuardAI Scan läuft</h2>
            <p className="text-xs text-gray-400">
              Target: <span className="font-mono text-cyan-400">{url}</span>
            </p>
          </div>
        </div>

        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 mb-6">
          <motion.div
            className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="code-block-styled p-4 space-y-4 text-xs">
          <div className="flex items-start gap-3 text-gray-200">
            <Server className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Scan-Anfrage wurde an das GuardAI-Backend gesendet.</p>
              <p className="text-gray-500 mt-1">Der Browser wartet auf das reale Scanner-Ergebnis.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-gray-200">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Nur tatsächlich ausgeführte Checks zählen.</p>
              <p className="text-gray-500 mt-1">
                Fehlende oder nicht ausgeführte Prüfungen werden nicht als bestanden dargestellt.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-gray-200">
            <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Evidence und Coverage folgen mit dem Ergebnis.</p>
              <p className="text-gray-500 mt-1">
                Dieser Bildschirm simuliert keine SAST-, DSGVO-, AI-Act- oder Accessibility-Schritte.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 text-[11px] text-gray-500 leading-relaxed">
          Die Dauer hängt vom Target und vom Backend ab. GuardAI zeigt erst nach der Antwort an,
          welche Scanner tatsächlich ausgeführt wurden.
        </div>
      </motion.div>
    </div>
  );
};
