import React from 'react';
import { ShieldCheck, Sparkles, Award, CreditCard, RefreshCw, FileText, LayoutDashboard, Bell, Bot, ScanEye } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';
import type { ActiveTab } from '../types/navigation';
import { isActiveTab } from '../types/navigation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasScanResult: boolean;
  onNewScan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasScanResult,
  onNewScan,
}) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'scanner', label: 'Scanner', icon: Sparkles },
    { id: 'dashboard', label: 'Meine Audits', icon: LayoutDashboard },
    { id: 'audit-hub', label: 'Audit Hub (SOC 2)', icon: LayoutDashboard },
    { id: 'ai-counsel', label: 'AI Legal Counsel', icon: Bot },
    { id: 'truesight', label: 'TrueSight AI', icon: ScanEye },
    { id: 'legal-docs', label: 'Smart Docs', icon: FileText },
    { id: 'templates', label: 'Vorlagen', icon: FileText },
    { id: 'integrations', label: 'Integrationen', icon: ShieldCheck },
    { id: 'policy', label: 'Policy Engine', icon: ShieldCheck },
    { id: 'badge', label: 'Trust Badge', icon: Award },
    { id: 'trust-center', label: 'Trust Center', icon: ShieldCheck },
    { id: 'pricing', label: 'Pricing', icon: CreditCard },
    ...(hasScanResult ? [{ id: 'report' as ActiveTab, label: 'Report', icon: FileText }] : []),
  ];

  const handleTabChange = (value: string) => {
    if (isActiveTab(value)) {
      setActiveTab(value);
    }
  };

  return (
    <header className="no-print sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
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
                  Prototype
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <WorkspaceSwitcher />
          </div>
        </div>

        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative hidden sm:flex">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </Button>
          <ThemeToggle />
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
