import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Copy, Check, Award, Code2, Sparkles } from 'lucide-react';
import type { TrustBadgeConfig, ScanResult } from '../types/scanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';

interface BadgeGeneratorProps {
  scanResult?: ScanResult | null;
  onOpenTrustCenter?: () => void;
}

export const BadgeGenerator: React.FC<BadgeGeneratorProps> = ({ scanResult, onOpenTrustCenter }) => {
  const [config, setConfig] = useState<TrustBadgeConfig>({
    theme: 'dark-glass',
    showScore: true,
    language: 'de',
    position: 'bottom-right'
  });

  const [isCopied, setIsCopied] = useState(false);

  const domainName = scanResult?.targetDomain || 'deine-website.de';
  const score = scanResult?.overallScore || 94;

  const scriptCode = `<script 
  src="https://cdn.guardai.io/badge.v2.js" 
  data-site-id="gai_${domainName.replace(/[^a-z0-9]/gi, '_')}"
  data-theme="${config.theme}"
  data-show-score="${config.showScore}"
  data-position="${config.position}">
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 bg-emerald-500/10">
          <Award className="w-3.5 h-3.5 mr-1" /> Trust-Badge Generator
        </Badge>
        <h2 className="text-3xl font-extrabold tracking-tight">Zeige Vertrauen (Virales Marketing)</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Generiere hier dein Code-Snippet. Wenn deine Kunden sehen, dass du KI- & DSGVO-konform bist, steigerst du dein Vertrauen. Jeder Klick auf das Badge bringt dir zudem Traffic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" /> Konfiguration
            </CardTitle>
            <CardDescription>Pass den Badge an dein Website-Design an</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Theme Selector */}
            <div className="space-y-3">
              <Label>Design Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dark-glass', label: 'Dark Glass' },
                  { id: 'emerald-clean', label: 'Emerald Clean' },
                  { id: 'neon-border', label: 'Neon Border' },
                  { id: 'minimal-shield', label: 'Minimal Shield' }
                ].map((t) => (
                  <Button
                    key={t.id}
                    variant={config.theme === t.id ? 'default' : 'outline'}
                    onClick={() => setConfig({ ...config, theme: t.id as any })}
                    className="w-full justify-start h-10"
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Position Selector */}
            <div className="space-y-3">
              <Label>Positionierung</Label>
              <select
                value={config.position}
                onChange={(e) => setConfig({ ...config, position: e.target.value as any })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="bottom-right">Unten Rechts (Schwebe-Widget)</option>
                <option value="bottom-left">Unten Links (Schwebe-Widget)</option>
                <option value="inline">Im Footer eingebunden (Inline)</option>
              </select>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <Label>Dein HTML Einbau-Code:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-primary hover:text-primary/80"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {isCopied ? 'Kopiert!' : 'Code kopieren'}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto text-foreground/80 border select-all">
                {scriptCode}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview Canvas */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Live Vorschau
            </CardTitle>
            <CardDescription>Klicke auf das Badge, um das Zertifikat zu testen</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            
            {/* Mock Website Container */}
            <div className="bg-background border rounded-xl flex-1 min-h-[300px] p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
              <div className="flex items-center gap-1.5 border-b pb-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] font-mono text-muted-foreground ml-2">https://{domainName}</span>
              </div>

              {/* Mock lines */}
              <div className="opacity-10 space-y-3 py-4 flex-1">
                <div className="h-4 w-1/2 bg-foreground rounded" />
                <div className="h-3 w-3/4 bg-foreground rounded" />
                <div className="h-3 w-1/3 bg-foreground rounded" />
                <div className="h-3 w-2/3 bg-foreground rounded" />
              </div>

              {/* Interactive Badge Preview */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => onOpenTrustCenter && onOpenTrustCenter()}
                className={`cursor-pointer ${
                  config.position === 'bottom-left' ? 'self-start' : config.position === 'inline' ? 'self-center' : 'self-end'
                }`}
              >
                {config.theme === 'dark-glass' && (
                  <div className="bg-slate-900 border border-primary/50 px-4 py-2 rounded-full flex items-center gap-2 text-white text-xs font-semibold shadow-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>EU AI Act Konform</span>
                    {config.showScore && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{score}%</span>}
                  </div>
                )}

                {config.theme === 'emerald-clean' && (
                  <div className="bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2 text-white text-xs font-bold shadow-lg">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Geprüfte KI-Sicherheit</span>
                  </div>
                )}

                {config.theme === 'neon-border' && (
                  <div className="bg-black border-2 border-cyan-400 px-4 py-2 rounded-xl flex items-center gap-2 text-cyan-400 text-xs font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>GuardAI Verified</span>
                    {config.showScore && <span className="text-white">{score}%</span>}
                  </div>
                )}

                {config.theme === 'minimal-shield' && (
                  <div className="bg-muted px-3 py-1.5 rounded-md flex items-center gap-1.5 text-foreground text-xs font-medium border">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>AI Compliance OK</span>
                  </div>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
