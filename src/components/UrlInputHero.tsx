import React, { useState } from 'react';
import { Bot, Eye, FileText, Globe, Lock, Scale, Search, ShieldCheck, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { ScanOptions, SelectableWebScanOption } from '../types/scanOptions';
import { DEFAULT_SCAN_OPTIONS, FILE_SCAN_OPTIONS } from '../types/scanOptions';

interface UrlInputHeroProps {
  onStartScan: (target: string | File, options: ScanOptions) => void | Promise<void>;
  isScanning: boolean;
}

const MAX_CLIENT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt'];

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export const UrlInputHero: React.FC<UrlInputHeroProps> = ({ onStartScan, isScanning }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [mode, setMode] = useState<'web' | 'file'>('web');
  const [scanOptions, setScanOptions] = useState<ScanOptions>(DEFAULT_SCAN_OPTIONS);
  const [localError, setLocalError] = useState<string | null>(null);

  const enabledWebModuleCount = [scanOptions.aiAct, scanOptions.gdpr, scanOptions.security].filter(Boolean).length;

  const toggleWebModule = (key: SelectableWebScanOption) => {
    setScanOptions((current) => ({
      ...current,
      [key]: !current[key],
      fileMode: false,
    }));
    setLocalError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = inputUrl.trim();
    if (!value || isScanning) return;

    if (enabledWebModuleCount === 0) {
      setLocalError('Wähle mindestens ein derzeit verfügbares Prüfmodul aus.');
      return;
    }

    setLocalError(null);
    void onStartScan(value, { ...scanOptions, fileMode: false });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isScanning) return;

    if (file.size > MAX_CLIENT_FILE_BYTES) {
      setLocalError('Die Datei ist größer als 10 MB.');
      event.target.value = '';
      return;
    }

    if (!hasAllowedExtension(file.name)) {
      setLocalError('Der aktuelle Prototype akzeptiert hier nur PDF- und TXT-Dateien.');
      event.target.value = '';
      return;
    }

    setLocalError(null);
    void onStartScan(file, FILE_SCAN_OPTIONS);
    event.target.value = '';
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      <Badge variant="secondary" className="mb-7 px-4 py-1">
        <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
        GuardAI Technical Screening · Prototype
      </Badge>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-foreground">
        Technische Risiken erkennen. <br />
        <span className="text-primary">Evidence statt Compliance-Versprechen.</span>
      </h1>

      <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
        GuardAI wird zu einer Plattform für technische Security-, Privacy-, Accessibility- und
        AI-Governance-Prüfungen ausgebaut. Der aktuelle Scanner ist noch im aktiven Produktaufbau.
      </p>

      <Card className="max-w-3xl mx-auto text-left border-muted/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardContent className="p-6">
          <div className="flex gap-2 mb-6 p-1 rounded-lg bg-muted/50 w-fit">
            <button
              type="button"
              onClick={() => {
                setMode('web');
                setLocalError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                mode === 'web' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Globe className="w-4 h-4" /> Website / Repository
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('file');
                setLocalError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                mode === 'file' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <FileText className="w-4 h-4" /> Datei
            </button>
          </div>

          {mode === 'web' ? (
            <form onSubmit={handleSubmit}>
              <label htmlFor="guardai-target" className="text-sm font-medium">
                Öffentliche URL oder GitHub-Repository
              </label>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="guardai-target"
                    type="text"
                    value={inputUrl}
                    onChange={(event) => setInputUrl(event.target.value)}
                    placeholder="https://example.com oder https://github.com/org/repo"
                    className="pl-11 h-12 text-base bg-background/50"
                    autoComplete="url"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isScanning || !inputUrl.trim() || enabledWebModuleCount === 0}
                  className="h-12 px-6"
                  size="lg"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isScanning ? 'Scan läuft …' : 'Technischen Scan starten'}
                </Button>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold">Prüfmodule</legend>
                <p className="text-xs text-muted-foreground mt-1">
                  Die Auswahl wird an die Scanner-API gesendet. Im Ergebnis zählt nur tatsächlich ausgeführte Coverage.
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <label className="rounded-xl border bg-background/40 p-4 flex gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scanOptions.security}
                      onChange={() => toggleWebModule('security')}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center gap-2 font-medium text-sm"><Lock className="w-4 h-4 text-primary" /> Security</span>
                      <span className="block text-xs text-muted-foreground mt-1">Aktuelle Basis: technische HTTP-Header-Checks.</span>
                    </span>
                  </label>

                  <label className="rounded-xl border bg-background/40 p-4 flex gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scanOptions.gdpr}
                      onChange={() => toggleWebModule('gdpr')}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center gap-2 font-medium text-sm"><Scale className="w-4 h-4 text-primary" /> Privacy / DSGVO</span>
                      <span className="block text-xs text-muted-foreground mt-1">Aktuell AI-gestütztes Text-Screening; Browser-Evidence folgt.</span>
                    </span>
                  </label>

                  <label className="rounded-xl border bg-background/40 p-4 flex gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scanOptions.aiAct}
                      onChange={() => toggleWebModule('aiAct')}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center gap-2 font-medium text-sm"><Bot className="w-4 h-4 text-primary" /> AI Governance</span>
                      <span className="block text-xs text-muted-foreground mt-1">Aktuell AI-gestütztes Text-Screening, keine Rechtsentscheidung.</span>
                    </span>
                  </label>

                  <div className="rounded-xl border border-dashed bg-muted/20 p-4 flex gap-3 opacity-70" aria-disabled="true">
                    <input type="checkbox" checked={false} disabled className="mt-1" />
                    <span>
                      <span className="flex items-center gap-2 font-medium text-sm"><Eye className="w-4 h-4" /> Accessibility</span>
                      <span className="block text-xs text-muted-foreground mt-1">Noch nicht ausführbar. Aktivierung erst mit echtem Browser-/axe-Scanner.</span>
                    </span>
                  </div>
                </div>
              </fieldset>

              <p className="text-xs text-muted-foreground mt-4">
                Nicht ausgeführte Module werden nicht als bestanden dargestellt.
              </p>
            </form>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">PDF oder TXT analysieren</p>
              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.txt,text/plain,application/pdf"
                  onChange={handleFileChange}
                  disabled={isScanning}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <span className="font-semibold">Datei auswählen oder hier ablegen</span>
                <span className="text-xs text-muted-foreground mt-2">PDF/TXT · clientseitig maximal 10 MB · Prototype</span>
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Die vollständige serverseitige Upload-Härtung und Malware-Quarantäne ist Bestandteil der Build-Roadmap.
              </p>
            </div>
          )}

          {localError && (
            <div role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {localError}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
