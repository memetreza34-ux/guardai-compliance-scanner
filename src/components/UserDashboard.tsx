import { BarChart3, Globe, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Activity, TrendingUp, History, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const UserDashboard = () => {
  // Mock data for the dashboard
  const user = {
    name: 'Sarah Connor',
    plan: 'Enterprise (ISO 42001)',
    credits: 'Unbegrenzt'
  };

  const stats = [
    { label: 'Überwachte Domains', value: '3', icon: <Globe className="w-5 h-5 text-indigo-400" /> },
    { label: 'Ø Compliance Score', value: '78%', icon: <TrendingUp className="w-5 h-5 text-emerald-400" /> },
    { label: 'Gefundene Risiken', value: '14', icon: <ShieldAlert className="w-5 h-5 text-rose-400" /> },
    { label: 'Scans diesen Monat', value: '128', icon: <Activity className="w-5 h-5 text-cyan-400" /> }
  ];

  const domains = [
    { url: 'shop.ai-store.eu', score: 94, status: 'compliant', lastScan: 'Vor 2 Stunden', trend: '+2%' },
    { url: 'app.flowai.com', score: 72, status: 'warning', lastScan: 'Gestern', trend: '-5%' },
    { url: 'legacy-portal.de', score: 41, status: 'critical', lastScan: 'Vor 3 Tagen', trend: '0%' }
  ];

  const recentActivity = [
    { action: 'Automatischer Monats-Scan', domain: 'shop.ai-store.eu', date: 'Heute, 08:00', type: 'scan' },
    { action: 'PDF Report heruntergeladen', domain: 'app.flowai.com', date: 'Gestern, 14:30', type: 'download' },
    { action: 'Neues Risiko entdeckt (EU AI Act)', domain: 'legacy-portal.de', date: 'Vor 3 Tagen', type: 'alert' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/50 p-6 rounded-2xl border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Willkommen zurück, {user.name}</h1>
          <p className="text-muted-foreground mt-1">Hier ist die aktuelle Sicherheitslage deiner Infrastruktur.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 py-1 px-3">
            {user.plan}
          </Badge>
          <Button variant="default">Neuen Scan starten</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl border">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Domains */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Deine Portfolios
            </h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Alle anzeigen <ArrowRight className="w-4 h-4 ml-1"/></Button>
          </div>

          <div className="space-y-4">
            {domains.map((domain, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border bg-muted flex items-center justify-center">
                      {domain.status === 'compliant' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                      {domain.status === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-500" />}
                      {domain.status === 'critical' && <ShieldAlert className="w-6 h-6 text-rose-500" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        {domain.url}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Letzter Scan: {domain.lastScan}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-3 mb-1">
                      <span className={`text-xs font-bold ${
                        domain.trend.startsWith('+') ? 'text-emerald-500' : domain.trend.startsWith('-') ? 'text-rose-500' : 'text-muted-foreground'
                      }`}>
                        {domain.trend}
                      </span>
                      <span className="text-2xl font-bold">{domain.score}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    <Badge variant="outline" className={
                      domain.status === 'compliant' ? 'border-emerald-500/30 text-emerald-500' :
                      domain.status === 'warning' ? 'border-amber-500/30 text-amber-500' :
                      'border-rose-500/30 text-rose-500'
                    }>
                      {domain.status === 'compliant' ? 'Zertifiziert' : domain.status === 'warning' ? 'Risiken gefunden' : 'Kritisch'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar: Activity & Reports */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Aktivitäts-Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== recentActivity.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-16px] w-[2px] bg-border" />
                    )}
                    <div className="relative z-10 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center flex-shrink-0 mt-1">
                      {activity.type === 'scan' && <Activity className="w-3 h-3 text-primary" />}
                      {activity.type === 'download' && <Download className="w-3 h-3 text-primary" />}
                      {activity.type === 'alert' && <ShieldAlert className="w-3 h-3 text-rose-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-primary font-mono mt-0.5">{activity.domain}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">ISO 42001 Monatsbericht</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Dein monatlicher Management-Report für Juli 2026 ist jetzt verfügbar.
              </p>
              <Button className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Report Herunterladen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
