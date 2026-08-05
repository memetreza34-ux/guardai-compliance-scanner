import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Globe, Activity, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import type { ScanResult } from '../types/scanner';

interface PublicTrustCenterProps {
  scanResult?: ScanResult | null;
}

export const PublicTrustCenter: React.FC<PublicTrustCenterProps> = ({ scanResult }) => {
  const domainName = scanResult?.targetDomain || 'example.com';
  const score = scanResult?.overallScore || 98;
  const isCompliant = score >= 85;

  const vendors = [
    { name: 'OpenAI API', role: 'LLM Processor', region: 'EU (Frankfurt)', status: 'compliant' },
    { name: 'Vercel', role: 'Hosting', region: 'Global', status: 'compliant' },
    { name: 'Stripe', role: 'Payments', region: 'Global', status: 'compliant' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header / Branding */}
        <div className="flex justify-between items-center pb-6 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-lg tracking-tight">GuardAI Trust</span>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            Live Certificate
          </Badge>
        </div>

        {/* Main Certificate Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 ${isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          
          <Card className="relative bg-card shadow-2xl border-0 overflow-hidden">
            <div className={`h-2 w-full ${isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            
            <CardContent className="pt-10 pb-8 px-8 sm:px-12 text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${isCompliant ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                {isCompliant ? <ShieldCheck className="w-12 h-12" /> : <ShieldAlert className="w-12 h-12" />}
              </div>
              
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">{domainName}</h1>
                <p className="text-muted-foreground text-lg">
                  {isCompliant ? 'Dieses Unternehmen erfüllt höchste Sicherheits- und KI-Transparenzstandards.' : 'Dieses Unternehmen weist aktuelle Sicherheits- oder Transparenzrisiken auf.'}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> DSGVO Konform
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> EU AI Act (Art. 50)
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> NIS2 Supply Chain
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> CSRD (Green IT)
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> DSA (Jugendschutz)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center">
                <Activity className="w-4 h-4 mr-2" /> Live Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Letzter Scan</span>
                <span className="text-sm text-muted-foreground">Heute, {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Monitoring</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0">24/7 Aktiv</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trust Score</span>
                <span className="text-sm font-bold text-emerald-500">{score}/100</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center">
                <Lock className="w-4 h-4 mr-2" /> Sub-Processoren (Vendor Risk)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendors.map((vendor, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium leading-none">{vendor.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{vendor.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">{vendor.region}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Footer / CTA for GuardAI */}
        <div className="text-center pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Dieses Zertifikat wird automatisch von GuardAI ausgestellt und durch kontinuierliche Scans validiert.
          </p>
          <Button variant="outline" size="sm" className="rounded-full">
            <ShieldCheck className="w-4 h-4 mr-2" /> Auch deine Website absichern <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </div>

      </div>
    </div>
  );
};
