import React from 'react';
import { ShieldCheck, Sparkles, Award, CreditCard, RefreshCw, FileText, LayoutDashboard, Bell, Bot, ScanEye } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  activeTab: 'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard' | 'ai-counsel' | 'trust-center' | 'legal-docs' | 'audit-hub' | 'templates' | 'integrations' | 'policy' | 'truesight';
  setActiveTab: (tab: 'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard' | 'ai-counsel' | 'trust-center' | 'legal-docs' | 'audit-hub' | 'templates' | 'integrations' | 'policy' | 'truesight') => void;
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
    { id: 'audit-hub' as const, label: 'Audit Hub (SOC 2)', icon: LayoutDashboard },
    { id: 'ai-counsel' as const, label: 'AI Legal Counsel', icon: Bot },
    { id: 'truesight' as const, label: 'TrueSight AI', icon: ScanEye },
    { id: 'legal-docs' as const, label: 'Smart Docs', icon: FileText },
    { id: 'templates' as const, label: 'Vorlagen', icon: FileText },
    { id: 'integrations' as const, label: 'Integrationen', icon: ShieldCheck },
    { id: 'policy' as const, label: 'Policy Engine', icon: ShieldCheck },
    { id: 'badge' as const, label: 'Trust Badge', icon: Award },
    { id: 'trust-center' as const, label: 'Trust Center', icon: ShieldCheck },
    { id: 'pricing' as const, label: 'Pricing', icon: CreditCard },
    ...(hasScanResult ? [{ id: 'report' as const, label: 'Report', icon: FileText }] : [])
  ];

  return (
    <header className="no-print sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Workspace */}
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
                  Compliance
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block">
            <WorkspaceSwitcher />
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

