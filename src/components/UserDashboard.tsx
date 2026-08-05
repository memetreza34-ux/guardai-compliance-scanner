import { Activity, Globe, Zap, EyeOff, Lock, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, History, Download, ExternalLink, Bell, MessageSquare, LayoutDashboard, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const UserDashboard = ({ isPremium = false }: { isPremium?: boolean }) => {
  // Mock data for the dashboard
  const user = {
    name: 'Sarah Connor',
    plan: isPremium ? 'Pro (Solo)' : 'Free',
    credits: isPremium ? 'Unbegrenzt' : '0'
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
          <Badge variant="outline" className={`${isPremium ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'} py-1 px-3`}>
            {user.plan}
          </Badge>
          <Button variant="default">Neuen Scan starten</Button>
        </div>
      </div>

      {/* Live Monitoring Upsell Banner */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
              <EyeOff className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                Live-Überwachung ist pausiert <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-0">Achtung</Badge>
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                Deine Compliance-Scans sind nur statische Momentaufnahmen. Ohne <strong>Continuous Monitoring</strong> erfährst du nicht, wenn sich neue NPM-Abhängigkeiten (NIS2) ändern oder Marketing neue Tracker (DSGVO) installiert.
              </p>
            </div>
          </div>
          <Button className="shrink-0 bg-amber-500 hover:bg-amber-600 text-black font-bold">
            <Zap className="w-4 h-4 mr-2" /> Live-Alerts aktivieren (Pro)
          </Button>
        </div>
      )}

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

        {/* Sidebar: Activity, Team & Reports */}
        <div className="space-y-6">
          {/* Live Activity Stream */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" /> Live-Monitoring
                </span>
                {isPremium ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Pausiert</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 relative">
                {!isPremium && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-md border border-amber-500/20">
                    <Button variant="secondary" size="sm" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      <Lock className="w-3 h-3 mr-2" /> Upgrade für Live-Alerts
                    </Button>
                  </div>
                )}
                
                {/* Mock Stream */}
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">API /checkout gescannt</p>
                    <p className="text-muted-foreground">Vor 2 Min • Keine neuen Tracker gefunden</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">NIS2 Supply-Chain Check</p>
                    <p className="text-muted-foreground">Vor 14 Min • 3 Packages aktualisiert (Safe)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs opacity-75">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Neues DSGVO-Urteil indexiert</p>
                    <p className="text-muted-foreground">Vor 1 Std • Agenten-Wissen aktualisiert</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Täglicher Full-Scan (shop-demo)</p>
                    <p className="text-muted-foreground">Heute, 04:00 Uhr • Score: 41/100</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Team Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="E-Mail des Kollegen..." 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button size="sm">Einladen</Button>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
                        SC
                      </div>
                      <div>
                        <p className="text-sm font-bold">Sarah Connor (Du)</p>
                        <p className="text-xs text-muted-foreground">sarah@acme.corp</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                        MM
                      </div>
                      <div>
                        <p className="text-sm font-medium">Max Mustermann</p>
                        <p className="text-xs text-muted-foreground">max@acme.corp</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-muted/50">Viewer</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> E-Mail & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Täglicher Report</p>
                    <p className="text-xs text-muted-foreground">"Alles OK" Status-Update</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${isPremium ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isPremium ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Gesetzesänderungen</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500" /> Wichtige EU/US Updates
                    </p>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${isPremium ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isPremium ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Downtime / Fehler</p>
                    <p className="text-xs text-muted-foreground">Sofort-Alert bei Hacks</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${isPremium ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isPremium ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {!isPremium && (
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                    <Lock className="w-3 h-3 mr-2" /> E-Mail Alerts aktivieren
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Integrations (Slack, Jira, GitHub) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> App-Integrationen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#4A154B]/10 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-[#4A154B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Slack / MS Teams</p>
                      <p className="text-[10px] text-muted-foreground">Alerts in Channels posten</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Connect</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#0052CC]/10 flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-[#0052CC]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Jira / Asana</p>
                      <p className="text-[10px] text-muted-foreground">Tickets für Verstöße erstellen</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Connect</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-foreground/5 flex items-center justify-center">
                      <GitPullRequest className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">GitHub / GitLab</p>
                      <p className="text-[10px] text-muted-foreground">Auto-Fix Pull Requests</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Developer API & Webhooks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Developer API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">API Keys</p>
                      <p className="text-[10px] text-muted-foreground">Für CI/CD Integration</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Manage</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Webhooks</p>
                      <p className="text-[10px] text-muted-foreground">Real-time Events (JSON)</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Manage</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
