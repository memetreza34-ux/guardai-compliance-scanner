import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScanEye, Upload, Link2, FileText, AlertTriangle, Zap, CheckCircle2, Bot, Loader2, ScanLine } from 'lucide-react';

interface TrueSightProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

type ScanMode = 'image' | 'text' | 'url';

export const TrueSight: React.FC<TrueSightProps> = ({ isPremium, onUpgrade }) => {
  const [scanMode, setScanMode] = useState<ScanMode>('image');
  const [scanCount, setScanCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    score: number;
    explanation: string;
    type: 'fake' | 'real' | 'mixed';
  } | null>(null);

  const [inputValue, setInputValue] = useState('');
  
  const freeLimit = 3;
  const isPaywalled = !isPremium && scanCount >= freeLimit;

  const handleScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPaywalled) return;

    setIsScanning(true);
    setScanResult(null);

    // Simulate Deepfake/Bullshit scanning
    setTimeout(() => {
      setIsScanning(false);
      setScanCount(prev => prev + 1);

      // Randomize result for simulation
      const random = Math.random();
      if (random > 0.6) {
        setScanResult({
          score: 12,
          type: 'fake',
          explanation: 'Dieses Material ist zu 88% KI-generiert. Hinweise: Inkonsistente Schattierungen und unnatürliche Artefakte im Hintergrund.'
        });
      } else if (random > 0.3) {
        setScanResult({
          score: 95,
          type: 'real',
          explanation: 'Dieses Material scheint authentisch (menschlich) zu sein. Keine bekannten Deepfake-Muster oder KI-Wasserzeichen gefunden.'
        });
      } else {
        setScanResult({
          score: 55,
          type: 'mixed',
          explanation: 'Verdächtige Inhalte gefunden. Das Dokument wurde wahrscheinlich von einem Menschen verfasst, aber mit starken KI-Hilfsmitteln editiert.'
        });
      }
    }, 2500);
  };

  const resetScan = () => {
    setScanResult(null);
    setInputValue('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ScanEye className="w-8 h-8 text-violet-500" />
            TrueSight AI
          </h1>
          <p className="text-muted-foreground mt-2">Der Deepfake- & Bullshit-Filter. Finde heraus, was noch echt ist.</p>
        </div>
        {!isPremium && (
          <div className="text-right">
            <Badge variant="outline" className={`text-sm ${scanCount >= freeLimit ? 'border-destructive text-destructive' : 'border-primary/50 text-primary'}`}>
              {scanCount} / {freeLimit} Free Scans
            </Badge>
            {scanCount >= freeLimit && (
              <p className="text-xs text-destructive mt-1">Limit erreicht</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Scanner Input Area */}
        <Card className="lg:col-span-2 border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden">
          {/* Futuristic scanner beam effect */}
          {isScanning && (
            <div className="absolute top-0 left-0 w-full h-1 bg-violet-500/50 shadow-[0_0_15px_#8b5cf6] animate-[scan_2s_ease-in-out_infinite]" />
          )}

          <CardHeader>
            <div className="flex gap-2 p-1 bg-muted/50 w-fit rounded-lg mb-4">
              <button 
                onClick={() => setScanMode('image')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${scanMode === 'image' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <Upload className="w-4 h-4" /> Bild / Datei
              </button>
              <button 
                onClick={() => setScanMode('text')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${scanMode === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <FileText className="w-4 h-4" /> Text prüfen
              </button>
              <button 
                onClick={() => setScanMode('url')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${scanMode === 'url' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <Link2 className="w-4 h-4" /> Link (URL)
              </button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isPaywalled ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">Scan-Limit erreicht</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Du hast deine {freeLimit} kostenlosen TrueSight-Scans verbraucht. Upgrade auf Premium für unbegrenzte Analysen, API-Zugang und Team-Sharing.
                </p>
                <Button onClick={onUpgrade} size="lg" className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Zap className="w-4 h-4 mr-2" /> Premium freischalten
                </Button>
              </div>
            ) : scanResult ? (
              <div className="py-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
                
                {/* Authenticity Score Circle */}
                <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="10" 
                      strokeDasharray="283" 
                      strokeDashoffset={283 - (283 * scanResult.score) / 100}
                      className={`transition-all duration-1000 ease-out ${
                        scanResult.score > 80 ? 'text-emerald-500' : 
                        scanResult.score > 40 ? 'text-amber-500' : 'text-destructive'
                      }`} 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-black tabular-nums tracking-tighter">{scanResult.score}%</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">Echt</span>
                  </div>
                </div>

                <div className="max-w-lg text-center space-y-4">
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`px-3 py-1 text-sm ${
                      scanResult.type === 'fake' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      scanResult.type === 'real' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {scanResult.type === 'fake' ? '⚠️ KI-Generiert / Fake' :
                       scanResult.type === 'real' ? '✅ Authentisch / Menschlich' :
                       '👀 Gemischte Inhalte'}
                    </Badge>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90 font-medium">
                    {scanResult.explanation}
                  </p>
                  
                  <Button onClick={resetScan} variant="outline" className="mt-6">
                    Neuen Scan starten
                  </Button>
                </div>

              </div>
            ) : (
              <div className="space-y-6">
                {scanMode === 'image' && (
                  <div className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-all ${isScanning ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:bg-muted/50 cursor-pointer'}`}>
                    {isScanning ? (
                      <>
                        <ScanLine className="w-12 h-12 text-violet-500 animate-pulse mb-4" />
                        <p className="text-violet-500 font-medium">Analysiere Pixel-Artefakte & Metadaten...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Datei ablegen oder auswählen</h3>
                        <p className="text-sm text-muted-foreground">Unterstützt JPG, PNG, WEBP, MP4 (Max 50MB)</p>
                        <Button onClick={() => handleScan()} className="mt-6" variant="secondary">
                          <ScanEye className="w-4 h-4 mr-2" /> Scanner starten
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {scanMode === 'text' && (
                  <div className="space-y-4">
                    <textarea 
                      className="w-full h-48 p-4 bg-background border border-border rounded-xl resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                      placeholder="Füge hier den verdächtigen Text (z.B. einen News-Artikel oder eine E-Mail) ein..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isScanning}
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => handleScan()} disabled={isScanning || !inputValue.trim()} className="bg-violet-600 hover:bg-violet-700">
                        {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanEye className="w-4 h-4 mr-2" />}
                        {isScanning ? 'Analysiere Text...' : 'Text analysieren'}
                      </Button>
                    </div>
                  </div>
                )}

                {scanMode === 'url' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input 
                          placeholder="https://example.com/article" 
                          className="pl-10 h-12 text-lg"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          disabled={isScanning}
                        />
                      </div>
                      <Button onClick={() => handleScan()} disabled={isScanning || !inputValue.trim()} className="h-12 px-6 bg-violet-600 hover:bg-violet-700">
                        {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanEye className="w-5 h-5" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground px-2">Wir scrapen die Seite und prüfen Bilder sowie Texte auf KI-Ursprung.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-violet-500">
                <Bot className="w-5 h-5" />
                Wie funktioniert TrueSight?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>TrueSight nutzt mehrere spezialisierte KI-Modelle, um Fälschungen aufzudecken:</p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                  <span><strong>Pixel-Analyse:</strong> Erkennt GAN-Artefakte, Noise-Muster und fehlerhafte Anatomie in Bildern.</span>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                  <span><strong>NLP-Detektor:</strong> Analysiert Satzbau, Perplexität und Vokabular (Watermarking) von ChatGPT & Co.</span>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                  <span><strong>Querverweis-Check:</strong> Sucht im Web nach den ursprünglichen Quellen des Materials.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Zuletzt geprüft (Team)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'ceo_statement_video.mp4', score: 12, time: 'Vor 10 Min' },
                { name: 'linkedin_post_draft.txt', score: 98, time: 'Vor 2 Std' },
                { name: 'bewerber_foto.jpg', score: 45, time: 'Gestern' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-default">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className={`text-xs font-bold ${item.score > 80 ? 'text-emerald-500' : item.score > 40 ? 'text-amber-500' : 'text-destructive'}`}>
                      {item.score}% Echt
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
};
