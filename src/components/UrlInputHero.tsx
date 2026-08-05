import React, { useState } from 'react';
import { Search, Globe, CheckCircle2, SlidersHorizontal, Bot, Scale, Lock, Eye, ShieldCheck } from 'lucide-react';
import { SAMPLE_URLS } from '../data/mockScanEngine';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';

interface UrlInputHeroProps {
  onStartScan: (url: string | File, options: { aiAct: boolean; gdpr: boolean; wcag: boolean; security: boolean; fileMode: boolean }) => void;
  isScanning: boolean;
}

export const UrlInputHero: React.FC<UrlInputHeroProps> = ({ onStartScan, isScanning }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [scanOptions, setScanOptions] = useState({
    aiAct: true,
    gdpr: true,
    wcag: true,
    security: true,
    fileMode: false
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onStartScan(inputUrl, scanOptions);
  };

  const handleSelectPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    onStartScan(presetUrl, scanOptions);
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      
      {/* Category Pill Badge */}
      <Badge variant="secondary" className="mb-8 px-4 py-1">
        <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
        Kontinuierliches Web & Compliance Monitoring
      </Badge>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-foreground">
        Prüfe deine App & Website auf <br />
        <span className="text-primary">
          EU AI Act, DSGVO & Barrierefreiheit
        </span>
      </h1>

      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
        Vermeide teure Abmahnungen und Bußgelder. GuardAI scannt deine Web-Anwendungen kontinuierlich auf Transparenz-Pflichten, Datenschutzverstöße und Barrierefreiheit.
      </p>

      {/* Hero URL Input Card */}
      <Card className="max-w-3xl mx-auto text-left border-muted/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardContent className="p-6">
          {/* Tabs for Mode Selection */}
          <div className="flex gap-4 mb-6 border-b pb-2">
            <button 
              type="button"
              className={`pb-2 text-sm font-medium transition-colors ${!scanOptions.fileMode ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
              onClick={() => setScanOptions({ ...scanOptions, fileMode: false })}
            >
              🌐 Web & Code Scan
            </button>
            <button 
              type="button"
              className={`pb-2 text-sm font-medium transition-colors ${scanOptions.fileMode ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
              onClick={() => setScanOptions({ ...scanOptions, fileMode: true })}
            >
              📄 Datei & Asset Scan
            </button>
          </div>

          {!scanOptions.fileMode ? (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://deine-domain.de ODER github.com/user/repo"
                    className="pl-11 h-12 text-base bg-background/50"
                  />
                </div>
                <Button type="submit" disabled={isScanning} className="h-12 px-6" size="lg">
                  <Search className="w-4 h-4 mr-2" />
                  {isScanning ? 'Scan läuft...' : 'Kostenlos Prüfen'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onStartScan(e.target.files[0] as any, scanOptions);
                  }
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">PDF, Flyer oder Bild hochladen</h3>
                <p className="text-sm text-muted-foreground">KI prüft auf Urheberrecht & IP (Max 10MB)</p>
              </div>
            </div>
          )}

          {/* Quick Options Header */}
          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground h-8 text-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
                {showAdvanced ? 'Prüf-Module verbergen' : 'Prüf-Module anpassen'}
              </Button>

              <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Web & GitHub Support
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Supply-Chain Analyse
                </span>
              </div>
            </div>

            {/* Advanced Checkbox Options */}
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                  <input
                    type="checkbox"
                    checked={scanOptions.aiAct}
                    onChange={(e) => setScanOptions({ ...scanOptions, aiAct: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <Bot className="w-4 h-4 text-muted-foreground" /> EU AI Act
                </Label>

                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                  <input
                    type="checkbox"
                    checked={scanOptions.gdpr}
                    onChange={(e) => setScanOptions({ ...scanOptions, gdpr: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <Scale className="w-4 h-4 text-muted-foreground" /> DSGVO Privacy
                </Label>

                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                  <input
                    type="checkbox"
                    checked={scanOptions.wcag}
                    onChange={(e) => setScanOptions({ ...scanOptions, wcag: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <Eye className="w-4 h-4 text-muted-foreground" /> Barrierefreiheit
                </Label>

                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                  <input
                    type="checkbox"
                    checked={scanOptions.security}
                    onChange={(e) => setScanOptions({ ...scanOptions, security: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground" /> Security
                </Label>
              </div>
            )}


          {/* Demo Preset Buttons */}
          <div className="mt-6 pt-5 border-t">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Schnelltest-Websites wählen:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_URLS.map((preset, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectPreset(preset.url)}
                  className="h-7 text-xs px-2.5 bg-background/50"
                >
                  <Globe className="w-3 h-3 mr-1.5 text-muted-foreground" /> {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-16 text-left">
        <Card className="bg-card/50 border-muted/50">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-foreground mb-2">
              <Bot className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">EU AI Act Transparenz</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Prüft automatisch, ob Chatbots & KI-Komponenten ordnungsgemäß deklariert sind.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-muted/50">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-foreground mb-2">
              <Scale className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">DSGVO & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Erkennt illegalen Datenabfluss an Drittserver und Cookie-Tracker.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-muted/50">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-foreground mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Audit-Zertifikat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generiere ein Compliance-Zertifikat als Nachweis für deine Kunden und Nutzer.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-muted/50">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-foreground mb-2">
              <Globe className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Kontinuierliches Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automatische Re-Scans der gesamten Domain. Bei Fehlern schlägt das System Alarm.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
