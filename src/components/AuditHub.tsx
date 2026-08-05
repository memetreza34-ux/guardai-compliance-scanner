import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ShieldCheck, Server, Lock, Bot, FileText, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

export const AuditHub: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Hub</h2>
          <p className="text-muted-foreground mt-1">Compliance OS: Automatisiertes Evidence-Tracking für ISO 27001 & SOC 2.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Audit Report exportieren
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-muted-foreground">SOC 2 Readiness</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">In Progress</Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">68%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-muted-foreground">ISO 27001 Controls</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">On Track</Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">92/114</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-muted-foreground">EU AI Act (Art. 50)</span>
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Action Needed</Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">3</span>
              <span className="text-sm text-muted-foreground mb-1">Offene Tasks</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Controls Table */}
      <Card className="border-muted/50 shadow-sm">
        <CardHeader>
          <CardTitle>Continuous Controls Monitoring</CardTitle>
          <CardDescription>Automatisierte Überwachung der System-Sicherheit und Richtlinien.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Control Name</th>
                  <th className="px-4 py-3">Framework</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Letzter Check</th>
                  <th className="px-4 py-3 rounded-tr-md">Integration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 font-medium flex items-center gap-3">
                    <Server className="w-4 h-4 text-primary" />
                    Infrastruktur Vulnerability Scan
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">SOC 2 (CC7.1)</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-green-500">
                      <CheckCircle2 className="w-4 h-4" /> Passing
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">Heute, 08:30</td>
                  <td className="px-4 py-4"><Badge variant="outline">GitHub Actions</Badge></td>
                </tr>

                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 font-medium flex items-center gap-3">
                    <Lock className="w-4 h-4 text-primary" />
                    Verschlüsselung im Transit (HSTS)
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">ISO 27001 (A.10)</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-green-500">
                      <CheckCircle2 className="w-4 h-4" /> Passing
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">Heute, 09:15</td>
                  <td className="px-4 py-4"><Badge variant="outline">GuardAI Scanner</Badge></td>
                </tr>

                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 font-medium flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Datenschutz-Richtlinie aktuell
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">GDPR / DSGVO</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-yellow-500">
                      <AlertTriangle className="w-4 h-4" /> Review nötig
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">Vor 14 Tagen</td>
                  <td className="px-4 py-4"><Badge variant="outline">Google Drive</Badge></td>
                </tr>

                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 font-medium flex items-center gap-3">
                    <Bot className="w-4 h-4 text-primary" />
                    KI-Transparenz (Chatbot)
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">EU AI Act</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-red-500">
                      <Circle className="w-4 h-4 fill-red-500" /> Failing
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">Gestern, 18:00</td>
                  <td className="px-4 py-4"><Badge variant="outline">GuardAI Crawler</Badge></td>
                </tr>

              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
