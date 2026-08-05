import { useState } from 'react';
import { Send, Bot, ShieldCheck, Scale, Lock, AlertTriangle, ArrowRight, Zap, FileSearch, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  isDocument?: boolean;
}

export function AiCounsel({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade: () => void }) {
  const [activePersona, setActivePersona] = useState<'dr-schmidt' | 'max' | 'cyber' | 'audit'>('dr-schmidt');
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'dr-schmidt': [
      { id: '1', sender: 'ai', text: 'Hallo! Ich bin Dr. Schmidt, dein virtueller Berater für den EU AI Act. Welche Befunde deines Audits sollen wir besprechen?' }
    ],
    'max': [
      { id: '1', sender: 'ai', text: 'Hi, ich bin Max, spezialisiert auf DSGVO und Privacy. Wo drückt der Schuh beim Cookie-Banner?' }
    ],
    'cyber': [
      { id: '1', sender: 'ai', text: 'Cyber-Bot initialisiert. Bereit für Code-Review und Security-Checks (XSS, Injection).' }
    ],
    'audit': [
      { id: '1', sender: 'ai', text: 'Willkommen beim Compliance & Audit Copilot. Lade deine Verträge (z.B. AVV, AGBs, Nutzungsbedingungen) hoch, und ich prüfe sie automatisch auf DSGVO- und AI-Act-Konformität.' }
    ]
  });

  const personas = [
    { id: 'dr-schmidt', name: 'Dr. Schmidt', role: 'EU AI Act Auditor', icon: Scale, color: 'text-primary bg-primary/10' },
    { id: 'max', name: 'Max', role: 'DSGVO Experte', icon: ShieldCheck, color: 'text-cyan-500 bg-cyan-500/10' },
    { id: 'cyber', name: 'Cyber-Bot', role: 'Security Analyst', icon: Lock, color: 'text-rose-500 bg-rose-500/10' },
    { id: 'audit', name: 'Audit Copilot', role: 'Vertragsprüfung', icon: FileSearch, color: 'text-violet-500 bg-violet-500/10' },
  ] as const;

  const currentMessages = messages[activePersona] || [];
  
  // Paywall Logic
  const messageCount = currentMessages.filter(m => m.sender === 'user').length;
  const isPaywalled = !isPremium && messageCount >= (activePersona === 'audit' ? 1 : 2); // Only 1 upload for free

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isPaywalled) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: inputValue };
    appendMessage(activePersona, userMessage);
    setInputValue('');
    simulateAiResponse(activePersona, userMessage.text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isPaywalled) return;

    // Simulate file upload
    const userMessage: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: `📄 ${file.name} hochgeladen. Bitte prüfe den Vertrag.`,
      isDocument: true
    };
    
    appendMessage(activePersona, userMessage);
    setIsUploading(true);

    setTimeout(() => {
      setIsUploading(false);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Ich habe das Dokument "${file.name}" analysiert. \n\n🚨 2 kritische Fehler gefunden:\n1. DSGVO: Es fehlt die Klausel zur Löschfrist der Kundendaten (Art. 17).\n2. AI Act: Nutzer werden nicht transparent darauf hingewiesen, dass KI-Modelle zur Datenverarbeitung eingesetzt werden.\n\nSoll ich dir direkt einen Änderungsvorschlag für den Vertrag generieren?`
      };
      appendMessage(activePersona, aiMessage);
    }, 2500);
  };

  const appendMessage = (persona: string, msg: Message) => {
    setMessages(prev => ({
      ...prev,
      [persona]: [...(prev[persona] || []), msg]
    }));
  };

  const simulateAiResponse = (persona: string, userInput: string) => {
    setTimeout(() => {
      const newUserMessageCount = (messages[persona]?.filter(m => m.sender === 'user').length || 0) + 1;
      
      if (!isPremium && newUserMessageCount >= (persona === 'audit' ? 1 : 2)) {
         const paywallMsg: Message = { 
           id: (Date.now() + 1).toString(), 
           sender: 'system', 
           text: '⚠️ Kostenloses Limit erreicht. Bitte upgrade auf den Premium-Plan, um uneingeschränkt mit unserem Legal-Team zu chatten oder weitere Verträge zu prüfen.' 
         };
         appendMessage(persona, paywallMsg);
      } else {
        const aiMessage: Message = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: `Basierend auf deiner Frage zu "${userInput.substring(0, 20)}...": Hier ist eine erste Einschätzung. Wir empfehlen dringend, die Transparenzpflichten nach Art. 50 sofort umzusetzen. Soll ich dir ein Code-Snippet dafür generieren?` 
        };
        appendMessage(persona, aiMessage);
      }
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] flex gap-6">
      
      {/* Sidebar Personas */}
      <div className="w-80 flex flex-col gap-4">
        <h2 className="text-xl font-bold px-2">Compliance Copiloten</h2>
        <div className="flex flex-col gap-2">
          {personas.map(p => {
            const Icon = p.icon;
            const isActive = activePersona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePersona(p.id)}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-card border-2 border-primary shadow-sm' 
                    : 'bg-card/50 border border-border hover:bg-card/80'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${p.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.role}</div>
                </div>
              </button>
            )
          })}
        </div>

        {!isPremium && (
          <Card className="mt-auto bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-sm">
              <div className="flex items-center gap-2 font-bold mb-2 text-primary">
                <Zap className="w-4 h-4" /> Premium Upgrade
              </div>
              <p className="text-muted-foreground mb-4 text-xs">
                Schalte unbegrenzte Vertragsprüfungen, Chats und direkten Code-Review frei.
              </p>
              <Button onClick={onUpgrade} size="sm" className="w-full">
                Jetzt Upgraden
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-card/50 border-border shadow-sm">
        <div className="p-6 border-b border-border bg-card flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${personas.find(p => p.id === activePersona)?.color}`}>
              {activePersona === 'audit' ? <FileSearch className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold">{personas.find(p => p.id === activePersona)?.name}</h3>
              <p className="text-xs text-muted-foreground">KI-gestützte Rechts- & Vertragsprüfung</p>
            </div>
          </div>
          {activePersona === 'audit' && (
            <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Audit Engine Online
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : msg.sender === 'system'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm w-full max-w-full'
                  : 'bg-muted rounded-tl-sm'
              }`}>
                {msg.sender === 'system' ? (
                  <div className="flex flex-col gap-3">
                    <span className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> System Notice
                    </span>
                    <span>{msg.text.replace('⚠️ ', '')}</span>
                    <Button onClick={onUpgrade} variant="destructive" size="sm" className="w-full mt-2 sm:w-auto">
                      Premium freischalten <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          {isUploading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-muted rounded-tl-sm text-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Vertrag wird durch Audit-Engine analysiert (DSGVO, AI Act)...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-card border-t border-border">
          {activePersona === 'audit' ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-border bg-background transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Klick hier</span> oder drag & drop</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX Verträge (Max 10MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx"
                    disabled={isPaywalled || isUploading}
                  />
                </label>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isPaywalled ? "Limit erreicht. Bitte upgraden." : "Oder stelle eine Frage zum Vertrag..."}
                  className="flex-1 bg-background"
                  disabled={isPaywalled || isUploading}
                />
                <Button type="submit" disabled={!inputValue.trim() || isPaywalled || isUploading}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isPaywalled ? "Limit erreicht. Bitte upgraden." : "Stelle eine rechtliche oder technische Frage..."}
                className="flex-1 bg-background"
                disabled={isPaywalled}
              />
              <Button type="submit" disabled={!inputValue.trim() || isPaywalled}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
