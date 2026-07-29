# GuardAI - Enterprise AI Compliance & Security Scanner

> **Ein psychologisch optimierter B2B Lead-Magnet & SaaS-Prototyp zur Analyse von Webseiten auf DSGVO-, KI-Act- und Security-Compliance.**

## 🧠 Projekt-Gehirn (Für AI & Entwickler)
Dieses Repository beinhaltet eine hochentwickelte React/Vite-Applikation, die als Verkaufs-Funnel (SaaS) getarnt ist. Der "Scanner" ist primär eine Mock-Engine (`mockScanEngine.ts`), die basierend auf URL-Eingaben extrem realistische, juristisch und technisch fundierte Audit-Befunde (DSGVO, EU AI Act, SAST/DAST, Dark Patterns) generiert.

Das Ziel der Software ist **Lead-Generierung** (via E-Mail Opt-in für einen Basis-Report) und **Monetarisierung** (via Stripe-Checkout Simulation für Premium-Berichte).

### 🎯 Kernziele & Intention
*   **Autorität aufbauen:** Den Nutzer durch die extreme Detailtiefe (25+ Checks, § Referenzen) überzeugen.
*   **Dringlichkeit (Pain) erzeugen:** Aufdecken von echten rechtlichen und technischen Risiken (z.B. fehlende Kündigungsbuttons, US-Hosting, React CVEs).
*   **Conversion erzwingen:** Die echten Lösungsansätze (Code-Snippets, PDF-Dossier) befinden sich hinter einer Paywall (Blurred Content).

### 🛠 Tech-Stack
*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS, Radix UI (shadcn/ui basierte Komponenten)
*   **Icons:** Lucide React
*   **Architektur:** Single Page Application (SPA) mit simulierter Backend-Logik im Client.

### 📂 Projektstruktur & Wichtige Dateien
*   `src/data/mockScanEngine.ts`: Das **Herzstück**. Eine massive Heuristik-Engine, die auf Basis von Keywords (z.B. "auth", "health") über 30 spezifische Fehler und Warnings generiert. Hier werden Rechtsgrundlagen (BGB, DSGVO, AI Act) und Tech-Vulnerabilities (SQLi, Prototype Pollution) injiziert.
*   `src/components/ComplianceDashboard.tsx`: Das Haupt-UI. Rendert Bento-Grid-Karten für 6 Kategorien (AI Act, DSGVO, Accessibility, Security, Legal Data, Consumer Protection). Setzt Paywalls (Blur-Effekte) für Nicht-Premium Nutzer ein.
*   `src/components/PrintableReport.tsx`: Ein druckoptimierter PDF-Report, der ebenfalls Monetarisierungs-Locks enthält.
*   `src/components/LeadGenModal.tsx`: E-Mail-Capture-Formular ("Kostenloser Basis-Report").
*   `src/components/CheckoutSimulation.tsx`: Ein simulierter Stripe-Checkout für 49€ / 199€ Pakete.
*   `src/components/ScanProgressModal.tsx`: Eine Terminal-ähnliche Ladeanimation, die Deep-Scans (Handelsregister-Prüfung, Source-Code Parsing) vorgaukelt.

### 🚀 Setup & Ausführung
\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## ⚖️ Features des "Scanners"
1. **EU AI Act Transparenz:** Erkennt fehlende Kennzeichnungspflichten für KI-Systeme (Art. 50).
2. **DSGVO & Privacy:** Schrems-II (US Hosting), Session-Replay Tracker (Hotjar) ohne Maskierung, Cookie-Banner Dark Patterns.
3. **Consumer Protection:** Fehlender Kündigungs-Button (BGB), verdeckte Preise (PAngV).
4. **Legal Data (Impressum):** Abgleich von HRB, USt-IdNr und OS-Plattform. Urheberrecht von Bildern.
5. **Security (SAST/DAST):** Veraltete UI-Libraries mit CVEs, Blind SQL Injection in APIs, fehlende DMARC/SPF Records.
6. **Accessibility:** WCAG 2.1 AA Kontrastfehler und fehlende ARIA-Labels.
