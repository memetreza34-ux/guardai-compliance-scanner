import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { GitBranch, Cloud, Server, MessageSquare, Database, CheckCircle2, Link2, Search, ArrowRight } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  category: 'cloud' | 'repo' | 'hr' | 'comm';
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  lastSync?: string;
}

const initialIntegrations: Integration[] = [
  { id: 'github', name: 'GitHub', category: 'repo', description: 'Monitor repositories, PRs, and branch protection rules.', icon: <GitBranch className="w-8 h-8" />, connected: true, lastSync: 'Vor 5 Minuten' },
  { id: 'aws', name: 'AWS', category: 'cloud', description: 'Continuous scanning of IAM, S3, EC2 and VPC configurations.', icon: <Cloud className="w-8 h-8 text-orange-500" />, connected: false },
  { id: 'gcp', name: 'Google Cloud', category: 'cloud', description: 'Audit GCP projects for secure defaults and encryption.', icon: <Server className="w-8 h-8 text-blue-500" />, connected: false },
  { id: 'slack', name: 'Slack', category: 'comm', description: 'Real-time alerts and ChatOps for compliance issues.', icon: <MessageSquare className="w-8 h-8 text-purple-500" />, connected: true, lastSync: 'Vor 1 Stunde' },
  { id: 'mongodb', name: 'MongoDB Atlas', category: 'cloud', description: 'Audit database clusters for encryption and access controls.', icon: <Database className="w-8 h-8 text-green-500" />, connected: false },
];

export const IntegrationsHub: React.FC = () => {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [searchQuery, setSearchQuery] = useState('');

  const handleConnect = (id: string) => {
    setIntegrations(prev => prev.map(int => 
      int.id === id ? { ...int, connected: !int.connected, lastSync: !int.connected ? 'Gerade eben' : undefined } : int
    ));
  };

  const filtered = integrations.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Integrationen (API)</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Verbinde deine gesamte Infrastruktur, um Continuous Control Monitoring (CCM) zu aktivieren. Wir sammeln automatisch Evidenzen für SOC2, ISO27001 und DSGVO.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Integration suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(integration => (
          <Card key={integration.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-md ${integration.connected ? 'border-primary/50' : 'border-border'}`}>
            {integration.connected && (
              <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden">
                <div className="absolute transform rotate-45 bg-primary text-primary-foreground text-[10px] font-bold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                  AKTIV
                </div>
              </div>
            )}
            <CardHeader className="flex flex-row items-start gap-4 pb-4">
              <div className="p-3 bg-muted rounded-xl shadow-inner border">
                {integration.icon}
              </div>
              <div className="flex-1 pt-1">
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <div className="mt-1">
                  {integration.connected ? (
                    <span className="inline-flex items-center text-xs font-medium text-emerald-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verbunden
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                      <Link2 className="w-3 h-3 mr-1" />
                      Nicht verbunden
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm min-h-[40px]">
                {integration.description}
              </CardDescription>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t pt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {integration.connected && integration.lastSync ? (
                  <span>Letzter Sync: {integration.lastSync}</span>
                ) : (
                  <span>0 Evidenzen</span>
                )}
              </div>
              <Button 
                variant={integration.connected ? "outline" : "default"} 
                size="sm"
                onClick={() => handleConnect(integration.id)}
                className={!integration.connected ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                {integration.connected ? 'Trennen' : 'Verbinden'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border shadow-sm flex flex-col items-center text-center">
        <Server className="w-12 h-12 text-primary mb-4 opacity-80" />
        <h3 className="text-xl font-bold mb-2">On-Premise (Air-Gapped)</h3>
        <p className="text-muted-foreground max-w-lg mb-6">
          Für maximale Datensouveränität bieten wir Docker/Kubernetes Images an. Führen Sie das Compliance OS vollständig offline in Ihrem eigenen Rechenzentrum aus.
        </p>
        <Button variant="outline" className="gap-2">
          Appliance herunterladen <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
