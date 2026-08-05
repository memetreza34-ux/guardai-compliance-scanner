import { useState } from 'react';
import { Send, Bot, ShieldCheck, Scale, Lock, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export function AiCounsel({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade: () => void }) {
  const [activePersona, setActivePersona] = useState<'dr-schmidt' | 'max' | 'cyber'>('dr-schmidt');
  const [inputValue, setInputValue] = useState('');
  
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'dr-schmidt': [
      { id: '1', sender: 'ai', text: 'Hallo! Ich bin Dr. Schmidt, dein virtueller Berater für den EU AI Act. Welche Befunde deines Audits sollen wir besprechen?' }
    ],
    'max': [
      { id: '1', sender: 'ai', text: 'Hi, ich bin Max, spezialisiert auf DSGVO und Privacy. Wo drückt der Schuh beim Cookie-Banner?' }
    ],
    'cyber': [
      { id: '1', sender: 'ai', text: 'Cyber-Bot initialisiert. Bereit für Code-Review und Security-Checks (XSS, Injection).' }
    ]
  });

  const personas = [
    { id: 'dr-schmidt', name: 'Dr. Schmidt', role: 'EU AI Act Auditor', icon: Scale, color: 'text-primary bg-primary/10' },
    { id: 'max', name: 'Max', role: 'DSGVO Experte', icon: ShieldCheck, color: 'text-cyan-500 bg-cyan-500/10' },
    { id: 'cyber', name: 'Cyber-Bot', role: 'Security Analyst', icon: Lock, color: 'text-rose-500 bg-rose-500/10' },
  ] as const;

  const currentMessages = messages[activePersona] || [];
  
  // Paywall Logic
  const messageCount = currentMessages.filter(m => m.sender === 'user').length;
  const isPaywalled = !isPremium && messageCount >= 2;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPaywalled) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: inputValue };
    
    setMessages(prev => ({
      ...prev,
      [activePersona]: [...(prev[activePersona] || []), userMessage]
    }));
    
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      // Re-evaluate paywall after user message is added
      const newUserMessageCount = (messages[activePersona]?.filter(m => m.sender === 'user').length || 0) + 1;
      
      if (!isPremium && newUserMessageCount >= 2) {
         const paywallMsg: Message = { 
           id: (Date.now() + 1).toString(), 
           sender: 'ai', 
           text: '⚠️ Kostenloses Limit erreicht. Bitte upgrade auf den Premium-Plan, um uneingeschränkt mit unserem Legal-Team zu chatten.' 
         };
         setMessages(prev => ({
          ...prev,
          [activePersona]: [...(prev[activePersona] || []), paywallMsg]
        }));
      } else {
        const aiMessage: Message = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: `Basierend auf deiner Frage zu "${userMessage.text.substring(0, 20)}...": Hier ist eine erste Einschätzung. Wir empfehlen dringend, die Transparenzpflichten nach Art. 50 sofort umzusetzen. Soll ich dir ein Code-Snippet dafür generieren?` 
        };
        setMessages(prev => ({
          ...prev,
          [activePersona]: [...(prev[activePersona] || []), aiMessage]
        }));
      }
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] flex gap-6">
      
      {/* Sidebar Personas */}
      <div className="w-80 flex flex-col gap-4">
        <h2 className="text-xl font-bold px-2">Dein Legal-Team</h2>
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
                Schalte unbegrenzte Chats, Dokumenten-Generierung und direkten Code-Review frei.
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
        <div className="p-6 border-b border-border bg-card flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${personas.find(p => p.id === activePersona)?.color}`}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">{personas.find(p => p.id === activePersona)?.name}</h3>
            <p className="text-xs text-muted-foreground">KI-gestützte Rechtsberatung (Beta)</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-muted rounded-tl-sm'
              }`}>
                {msg.sender === 'ai' && msg.text.includes('⚠️') ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-destructive font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Limit erreicht
                    </span>
                    <span>{msg.text.replace('⚠️ ', '')}</span>
                    <Button onClick={onUpgrade} variant="default" size="sm" className="w-full mt-2">
                      Premium freischalten <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-card border-t border-border">
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
        </div>
      </Card>

    </div>
  );
}
