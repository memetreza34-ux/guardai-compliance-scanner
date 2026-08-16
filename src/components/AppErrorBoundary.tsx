import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GuardAI application error:', error, info);
  }

  private reloadApplication = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <section
          role="alert"
          className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-card p-8 shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold mt-5">GuardAI konnte diese Ansicht nicht laden</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Ein unerwarteter Frontend-Fehler wurde abgefangen. Es wird kein Scan-Ergebnis erfunden und kein fehlerhafter Zustand als Erfolg angezeigt.
          </p>
          <Button type="button" onClick={this.reloadApplication} className="mt-6">
            <RefreshCw className="w-4 h-4 mr-2" /> Anwendung neu laden
          </Button>
        </section>
      </main>
    );
  }
}
