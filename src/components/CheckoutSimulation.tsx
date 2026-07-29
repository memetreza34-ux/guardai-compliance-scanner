import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ShieldCheck, Lock, CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react';

interface CheckoutSimulationProps {
  planName: string;
  price: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutSimulation({ planName, price, onClose, onSuccess }: CheckoutSimulationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 2500);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
        <Card className="w-full max-w-md text-center py-8 border-emerald-500/30 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10 animate-in zoom-in duration-500">
          <CardContent className="space-y-4">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold">Zahlung erfolgreich!</h2>
            <p className="text-muted-foreground">Ihr Account wurde auf Premium hochgestuft. Alle Befunde und Lösungs-Codes sind nun freigeschaltet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 my-auto animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Left Side: Checkout Form */}
        <div className="space-y-6">
          <button onClick={onClose} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zur Übersicht
          </button>
          
          <div>
            <h2 className="text-3xl font-extrabold mb-2">Checkout</h2>
            <p className="text-muted-foreground">Schließen Sie Ihre Bestellung sicher ab.</p>
          </div>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold border-b border-border pb-2">Rechnungsdetails</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vorname</label>
                  <Input required placeholder="Max" className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nachname</label>
                  <Input required placeholder="Mustermann" className="bg-muted/30" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-Mail</label>
                <Input required type="email" placeholder="max@unternehmen.de" className="bg-muted/30" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold border-b border-border pb-2">Zahlungsmethode</h3>
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="font-bold">Kreditkarte</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-5 bg-muted rounded"></div>
                    <div className="w-8 h-5 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kartendetails (Demo)</label>
                <Input required placeholder="4242 4242 4242 4242" className="font-mono bg-muted/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gültig bis</label>
                  <Input required placeholder="MM/YY" className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CVC</label>
                  <Input required placeholder="123" className="bg-muted/30" />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full font-bold text-lg" disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Verarbeite Zahlung...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Zahlungspflichtig bestellen
                </span>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> SSL-Verschlüsselt durch Stripe
            </p>
          </form>
        </div>

        {/* Right Side: Order Summary */}
        <div className="bg-muted/30 rounded-2xl p-8 border border-border h-fit">
          <h3 className="font-bold text-xl mb-6">Bestellübersicht</h3>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="font-bold text-primary">{planName}</h4>
              <p className="text-sm text-muted-foreground">Vollzugriff auf den Security & Compliance Audit</p>
            </div>
            <span className="font-bold text-xl">{price}</span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Zwischensumme</span>
              <span>{price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Umsatzsteuer (19%)</span>
              <span>Inklusive</span>
            </div>
          </div>

          <div className="border-t border-border pt-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="font-bold">Gesamtsumme</span>
              <span className="font-extrabold text-2xl">{price}</span>
            </div>
          </div>

          <div className="bg-background rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">14 Tage Geld-Zurück-Garantie</p>
                <p className="text-muted-foreground">Ohne Wenn und Aber.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Sofortige Freischaltung</p>
                <p className="text-muted-foreground">Code-Snippets & PDF direkt verfügbar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
