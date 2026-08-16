import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Search, Globe, LayoutDashboard, CreditCard, ShieldCheck, FileText, Zap, Settings, ChevronRight, ScanEye } from 'lucide-react';
import type { ActiveTab } from '../types/navigation';

interface CommandPaletteProps {
  onNavigate: (tab: ActiveTab) => void;
}

interface CommandAction {
  id: string;
  label: string;
  icon: ReactNode;
  tab: ActiveTab;
  category: string;
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions: CommandAction[] = [
    { id: 'scanner', label: 'Neuen Scan starten', icon: <Search className="w-4 h-4" />, tab: 'scanner', category: 'Aktionen' },
    { id: 'dashboard', label: 'Dashboard öffnen', icon: <LayoutDashboard className="w-4 h-4" />, tab: 'dashboard', category: 'Navigation' },
    { id: 'pricing', label: 'Abrechnung & Upgrade', icon: <CreditCard className="w-4 h-4" />, tab: 'pricing', category: 'Einstellungen' },
    { id: 'badge', label: 'Trust-Badge generieren', icon: <ShieldCheck className="w-4 h-4" />, tab: 'badge', category: 'Tools' },
    { id: 'ai-counsel', label: 'AI Legal Counsel fragen', icon: <Zap className="w-4 h-4" />, tab: 'ai-counsel', category: 'Tools' },
    { id: 'legal-docs', label: 'Rechtstexte (AGB/DSGVO)', icon: <FileText className="w-4 h-4" />, tab: 'legal-docs', category: 'Tools' },
    { id: 'templates', label: 'Vorlagen & Snippets (Copypaste)', icon: <FileText className="w-4 h-4" />, tab: 'templates', category: 'Tools' },
    { id: 'truesight', label: 'TrueSight (Deepfake & AI Scanner)', icon: <ScanEye className="w-4 h-4 text-violet-500" />, tab: 'truesight', category: 'Tools' },
    { id: 'integrations', label: 'Integrationen & APIs verwalten', icon: <Search className="w-4 h-4" />, tab: 'integrations', category: 'System' },
    { id: 'policy', label: 'Policy Engine & Graph', icon: <LayoutDashboard className="w-4 h-4" />, tab: 'policy', category: 'System' },
    { id: 'settings', label: 'Webhooks & API (Dev)', icon: <Settings className="w-4 h-4" />, tab: 'dashboard', category: 'Einstellungen' },
  ];

  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (tab: ActiveTab) => {
    onNavigate(tab);
    setIsOpen(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed left-[50%] top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[60vh]">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex h-14 w-full rounded-md bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Wonach suchst du?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
            ESC
          </div>
        </div>

        <div className="overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              Keine Ergebnisse gefunden.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.tab)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground text-left text-sm transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      {action.icon}
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground group-hover:text-accent-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Gehe zu
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Navigation</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Verwende</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">↑</span>
            </kbd>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">↓</span>
            </kbd>
            <span>zum Navigieren</span>
          </div>
        </div>
      </div>
    </>
  );
}
