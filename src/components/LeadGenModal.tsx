import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Mail, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LeadGenModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadGenModal({ onClose, onSuccess }: LeadGenModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <Card className="w-full max-w-md relative z-10 border-primary/20 shadow-2xl shadow-primary/10 animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isSuccess ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <CardTitle className="text-2xl font-bold">Basis-Report anfordern</CardTitle>
          <CardDescription className="text-sm mt-2">
            Wir haben kritische Fehler auf Ihrer Webseite gefunden. Tragen Sie Ihre geschäftliche E-Mail-Adresse ein, um den kostenlosen Basis-Report als PDF zu erhalten.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-emerald-500 font-bold">Report erfolgreich versendet!</p>
              <p className="text-sm text-muted-foreground">Bitte prüfen Sie Ihren Posteingang (und Spam-Ordner) in den nächsten Minuten.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Business E-Mail Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ceo@ihre-firma.de" 
                    className="pl-9 bg-muted/50 border-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Generiere PDF...
                  </span>
                ) : (
                  'Jetzt Basis-Report sichern'
                )}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Durch Klick auf den Button stimmen Sie unseren Datenschutzbestimmungen zu. Wir behandeln Ihre Daten streng vertraulich.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
