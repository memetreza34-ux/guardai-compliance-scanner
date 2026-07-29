import React from 'react';
import { ShieldCheck, Sparkles, Award, CreditCard, RefreshCw, FileText, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface NavbarProps {
  activeTab: 'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard';
  setActiveTab: (tab: 'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard') => void;
  hasScanResult: boolean;
  onNewScan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasScanResult,
  onNewScan
}) => {
  const tabs = [
    { id: 'scanner' as const, label: 'Scanner', icon: Sparkles },
    { id: 'dashboard' as const, label: 'Meine Audits', icon: LayoutDashboard },
    { id: 'badge' as const, label: 'Trust Badge', icon: Award },
    { id: 'pricing' as const, label: 'Pricing', icon: CreditCard },
    ...(hasScanResult ? [{ id: 'report' as const, label: 'Report', icon: FileText }] : [])
  ];

  return (
    <header className="no-print sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('scanner')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-foreground">
                GuardAI
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                Compliance
              </span>
            </div>
          </div>
        </div>

        {/* Floating Tab Selector */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-muted">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="text-xs flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {hasScanResult ? (
            <Button onClick={onNewScan} variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Neuer Scan
            </Button>
          ) : (
            <Button onClick={() => setActiveTab('pricing')} variant="default" size="sm">
              Pricing
            </Button>
          )}
        </div>

      </div>
    </header>
  );
};

