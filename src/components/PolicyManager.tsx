import React, { useState } from 'react';
import { Network, GitMerge, FileCode2, TerminalSquare, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface PolicyNode {
  id: string;
  name: string;
  type: 'framework' | 'control' | 'evidence';
  status: 'passing' | 'failing' | 'unknown';
  relatedIds: string[];
}

const mockGraph: PolicyNode[] = [
  { id: 'f-gdpr', name: 'DSGVO', type: 'framework', status: 'passing', relatedIds: ['c-encryption', 'c-consent'] },
  { id: 'f-soc2', name: 'SOC 2 Type II', type: 'framework', status: 'failing', relatedIds: ['c-encryption', 'c-access'] },
  { id: 'f-aiact', name: 'EU AI Act', type: 'framework', status: 'passing', relatedIds: ['c-transparency'] },
  
  { id: 'c-encryption', name: 'Data at Rest Encryption', type: 'control', status: 'passing', relatedIds: ['e-aws-s3', 'e-mongo'] },
  { id: 'c-consent', name: 'User Consent Collection', type: 'control', status: 'passing', relatedIds: ['e-cookie-banner'] },
  { id: 'c-access', name: 'Role-Based Access (RBAC)', type: 'control', status: 'failing', relatedIds: ['e-github-teams'] },
  { id: 'c-transparency', name: 'AI Transparency Notice', type: 'control', status: 'passing', relatedIds: ['e-chatbot-ui'] },
  
  { id: 'e-aws-s3', name: 'AWS S3 Bucket Policies', type: 'evidence', status: 'passing', relatedIds: [] },
  { id: 'e-mongo', name: 'MongoDB Encryption At Rest', type: 'evidence', status: 'passing', relatedIds: [] },
  { id: 'e-cookie-banner', name: 'Cookie Consent Log', type: 'evidence', status: 'passing', relatedIds: [] },
  { id: 'e-github-teams', name: 'GitHub Admin Privileges', type: 'evidence', status: 'failing', relatedIds: [] },
  { id: 'e-chatbot-ui', name: 'Chatbot Header Code', type: 'evidence', status: 'passing', relatedIds: [] },
];

export const PolicyManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'graph' | 'as-code'>('graph');

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Policy Engine & Graph</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Unser Knowledge Graph mapped Beweise (Evidenzen) automatisch auf mehrere Frameworks gleichzeitig. "Write once, comply everywhere".
          </p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'graph' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Network className="w-4 h-4 inline-block mr-2" /> Graph View
          </button>
          <button 
            onClick={() => setActiveTab('as-code')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'as-code' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FileCode2 className="w-4 h-4 inline-block mr-2" /> Policy-as-Code
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['framework', 'control', 'evidence'].map((type, idx) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {idx + 1}
                </div>
                <h3 className="font-semibold capitalize text-lg">{type}s</h3>
              </div>
              
              {mockGraph.filter(n => n.type === type).map(node => (
                <Card key={node.id} className={`border-l-4 ${node.status === 'passing' ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-bold">{node.name}</CardTitle>
                      {node.status === 'failing' && <AlertCircle className="w-4 h-4 text-destructive" />}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xs text-muted-foreground font-mono mt-2 flex flex-wrap gap-1">
                      {node.relatedIds.length > 0 && <GitMerge className="w-3 h-3 inline mr-1" />}
                      {node.relatedIds.map(rid => (
                        <span key={rid} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{rid}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-primary" /> OPA (Open Policy Agent) Rego
            </CardTitle>
            <CardDescription>
              Integrieren Sie Compliance-Prüfungen direkt in Ihre CI/CD Pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="p-6 text-sm font-mono bg-zinc-950 text-zinc-50 overflow-x-auto">
<code className="text-purple-400">package</code> compliance.soc2.access_control

<code className="text-blue-400">import</code> data.github.teams

<code className="text-green-400"># Fail if any user outside of 'Engineering' has admin rights to production repos</code>
<code className="text-yellow-300">deny</code>[msg] {'{'}
    team := teams[_]
    repo := team.repos[_]
    
    repo.environment == <code className="text-emerald-300">"production"</code>
    team.name != <code className="text-emerald-300">"Engineering"</code>
    team.permission == <code className="text-emerald-300">"admin"</code>

    msg := sprintf(<code className="text-emerald-300">"SOC2 Violation (CC6.1): Team '%v' has unauthorized admin access to '%v'"</code>, [team.name, repo.name])
{'}'}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
