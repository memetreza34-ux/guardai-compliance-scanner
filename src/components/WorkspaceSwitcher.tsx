import { useState } from 'react';
import { ChevronDown, Building2, User, Plus, Settings } from 'lucide-react';
import { Button } from './ui/button';

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'personal' | 'team'>('personal');

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 h-9 px-3 border-dashed"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeWorkspace === 'personal' ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Building2 className="w-4 h-4 text-primary" />
        )}
        <span className="font-semibold text-xs">
          {activeWorkspace === 'personal' ? 'Personal (Free)' : 'Acme Corp Team'}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            
            <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deine Workspaces
            </div>
            
            <div className="p-1">
              <button 
                onClick={() => { setActiveWorkspace('personal'); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeWorkspace === 'personal' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                }`}
              >
                <User className="w-4 h-4" />
                Personal Workspace
              </button>
              
              <button 
                onClick={() => { setActiveWorkspace('team'); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mt-1 ${
                  activeWorkspace === 'team' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Acme Corp Team
              </button>
            </div>

            <div className="border-t border-border p-1 mt-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Settings className="w-4 h-4" />
                Workspace Settings
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Plus className="w-4 h-4" />
                Neues Team erstellen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
