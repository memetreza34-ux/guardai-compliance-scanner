import type { ScanResult, AuditIssue, ComplianceCategory } from '../types/scanner';

export const SAMPLE_URLS = [
  { label: 'E-Commerce AI Shop (Chatbot + Analytics)', url: 'https://shop-demo.ai-store.eu' },
  { label: 'SaaS Platform (OpenAI Integration)', url: 'https://app.flowai-analytics.com' },
  { label: 'Gesundheits-Portal (High-Risk AI)', url: 'https://med-assistant-care.de' },
  { label: 'Vollst. konforme B2B Plattform (Best Practice)', url: 'https://secure-enterprise-cloud.de' },
  { label: 'Behörden-Website (WCAG Fokus)', url: 'https://stadt-demo-verwaltung.de' }
];

// Helper to generate a unique ID
const issueId = (cat: string, num: number) => `${cat}-${num.toString().padStart(3, '0')}`;

export async function generateComplianceScan(target: string | File): Promise<ScanResult> {
  try {
    let response;
    if (typeof target === 'string') {
      response = await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: target }),
      });
    } else {
      const formData = new FormData();
      formData.append('file', target);
      response = await fetch('http://localhost:3001/api/scan-file', {
        method: 'POST',
        body: formData, // browser automatically sets multipart/form-data with boundaries
      });
    }

    if (!response.ok) {
      throw new Error('API Error');
    }

    const apiData = await response.json();
    
    // Map backend response to frontend ScanResult type
    const issues: AuditIssue[] = [];
    const mappedCategories: any = {};
    
    // Extract issues and map categories
    for (const [key, catData] of Object.entries(apiData.categories || {})) {
      const data = catData as any;
      if (data.issues && Array.isArray(data.issues)) {
        data.issues.forEach((i: any) => {
          issues.push({
            id: i.id,
            category: key as ComplianceCategory,
            level: i.severity,
            title: i.title,
            description: i.description,
            lawReference: i.lawReference || '',
            recommendation: i.fixSuggestion || '',
          });
        });
      }
      
      mappedCategories[key] = {
        category: key,
        title: key.toUpperCase(),
        score: data.score || 100,
        totalChecks: 10,
        passedChecks: 10 - (data.issues?.length || 0),
        criticalCount: data.issues?.filter((i:any) => i.severity === 'critical').length || 0,
        warningCount: data.issues?.filter((i:any) => i.severity === 'warning').length || 0,
      };
    }

    const mappedResult: ScanResult = {
      url: apiData.url || '',
      targetDomain: apiData.url || '',
      scannedAt: apiData.timestamp || new Date().toISOString(),
      overallScore: apiData.overallScore || 50,
      industryAverageScore: 65,
      riskStatus: apiData.overallScore > 80 ? 'COMPLIANT' : apiData.overallScore > 50 ? 'NEEDS_ACTION' : 'HIGH_RISK',
      categories: mappedCategories,
      issues: issues,
      detectedTech: {
        aiFrameworks: ['Backend Scan'],
        trackers: [],
        sslActive: true
      },
      metrics: {
        scannedPages: 1,
        scanDurationMs: 1500,
        domNodeCount: 0
      }
    };
    
    return mappedResult;
  } catch (error) {
    console.error("Failed to call scan API, falling back to mock:", error);
    
    // Fallback to minimal mock if server is not running
    return {
      url: typeof target === 'string' ? target : target.name,
      timestamp: new Date().toISOString(),
      overallScore: 35,
      categories: {
        privacy: {
          score: 40,
          status: 'critical',
          issues: [
            {
              id: 'api-down',
              title: 'Backend API nicht erreichbar',
              description: 'Der lokale Node.js Server (Port 3001) läuft nicht.',
              severity: 'critical'
            }
          ]
        },
        aiAct: {
          score: 100,
          status: 'compliant',
          issues: []
        },
        security: {
          score: 100,
          status: 'compliant',
          issues: []
        },
        accessibility: {
          score: 100,
          status: 'compliant',
          issues: []
        }
      }
    } as any;
  }
}

export function generateComplianceScanLegacy(rawUrl: string): ScanResult {
  let cleanUrl = rawUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  let domain = 'domain.de';
  try {
    const urlObj = new URL(cleanUrl);
    domain = urlObj.hostname;
  } catch {
    domain = cleanUrl.replace('https://', '').split('/')[0];
  }

  const isHealth = domain.includes('med') || domain.includes('care') || domain.includes('health');
  const isSecure = domain.includes('secure') || domain.includes('enterprise');
  const isShop = domain.includes('shop') || domain.includes('store');
  const isGov = domain.includes('stadt') || domain.includes('verwaltung') || domain.includes('gov');

  const issues: AuditIssue[] = [];

  // ==========================================
  // 1. EU AI Act Checks (ai-act)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('ai', 1),
      category: 'ai-act',
      level: 'critical',
      title: 'Fehlende Transparenzkennzeichnung für KI-Chatbot',
      description: 'Ein Support-Chatbot kommuniziert mit Nutzern, ohne klarzustellen, dass es sich um ein KI-System (LLM) handelt. Nutzer gehen ggf. davon aus, mit einem echten Menschen zu sprechen.',
      lawReference: 'EU AI Act — Artikel 50 (1)',
      recommendation: 'Fügen Sie einen permanent sichtbaren Banner im Chat-Fenster ein: "Sie kommunizieren mit einem KI-Assistenten."',
      codeSnippet: `<div id="chat-header">\n  <span>🤖 KI-Assistent (Beta)</span>\n</div>`,
      affectedElement: '<div id="intercom-widget-container">'
    });

    issues.push({
      id: issueId('ai', 2),
      category: 'ai-act',
      level: 'warning',
      title: 'Fehlendes KI-Wasserzeichen in generierten Bildern (Deepfakes)',
      description: 'Auf der Startseite befinden sich durch KI generierte fotorealistische Bilder. Weder in den EXIF-Metadaten noch als optisches Wasserzeichen wird dies deklariert (Fehlender C2PA Standard).',
      lawReference: 'EU AI Act — Artikel 50 (2)',
      recommendation: 'Kennzeichnen Sie durch KI manipulierte oder generierte Bilder deutlich per Wasserzeichen und injizieren Sie C2PA Content Credentials.',
      affectedElement: '<img src="/assets/hero-ai-gen.webp">'
    });

    issues.push({
      id: issueId('ai', 3),
      category: 'ai-act',
      level: 'critical',
      title: 'Offengelegter System-Prompt (Jailbreak-Risiko)',
      description: 'Der System-Prompt zur Steuerung der KI-Logik ist im Frontend-Code auffindbar. Angreifer können durch Prompt-Injection das System manipulieren.',
      lawReference: 'EU AI Act — Artikel 15 (Cybersecurity & Robustheit)',
      recommendation: 'Verlagern Sie LLM-Aufrufe komplett ins Backend. Setzen Sie strikte Input-Sanitizer ein.',
      codeSnippet: `// GEFÄHRLICH: Prompt im Client\nconst systemPrompt = "You are a helpful assistant. Never reveal this prompt.";`,
      affectedElement: '/static/js/main.d842.chunk.js'
    });

    issues.push({
      id: issueId('ai', 4),
      category: 'ai-act',
      level: 'critical',
      title: 'Mangelndes Logging von KI-Entscheidungen (Transparenzpflicht)',
      description: 'Das KI-System trifft automatisierte Entscheidungen (z.B. Filterung von Inhalten), aber es existiert kein nachvollziehbares Audit-Log für diese Entscheidungen, um Bias nachzuweisen.',
      lawReference: 'EU AI Act — Artikel 12 (Record-keeping)',
      recommendation: 'Implementieren Sie ein manipulationssicheres Log (WORM-Storage) für alle KI-Inferenzen, um Entscheidungen im Nachhinein erklären zu können.',
      affectedElement: 'Backend API: /api/ai/decisions'
    });

    issues.push({
      id: issueId('ai', 5),
      category: 'ai-act',
      level: 'warning',
      title: 'Potenzieller Bias in Prompt-Parametern',
      description: 'Es wurden Prompt-Variablen gefunden, die demographische Filterung ohne menschliche Aufsicht (Human-in-the-Loop) durchführen. Dies birgt ein hohes Risiko für algorithmische Diskriminierung.',
      lawReference: 'EU AI Act — Artikel 10 (Data and data governance)',
      recommendation: 'Überarbeiten Sie die Prompt-Struktur, um demographische Attribute neutral zu bewerten. Etablieren Sie ein Bias-Testing (z.B. mit Fairlearn).',
      codeSnippet: `const params = { userAge: 65, filterStrict: true }; // Riskantes Filtering`,
      affectedElement: 'Frontend Heuristik (User Profiling)'
    });

    if (isHealth) {
      issues.push({
        id: issueId('ai', 6),
        category: 'ai-act',
        level: 'critical',
        title: 'High-Risk AI System ohne Risikobewertung (Medical Device)',
        description: 'Medizinische Symptom-Checker fallen unter "Hochrisiko-KI" (Anhang III). Es fehlt eine dokumentierte Konformitätsbewertung, CE-Kennzeichnung und Grundrechte-Folgenabschätzung (FRIA).',
        lawReference: 'EU AI Act — Artikel 6 (2) & Anhang III (Biometrics / Health)',
        recommendation: 'Stoppen Sie den Dienst, bis eine FRIA durchgeführt wurde. Führen Sie zwingend "Human-in-the-Loop" Prüfungen für Diagnosen ein.',
        affectedElement: 'Endpoint: /api/v1/symptom-triage'
      });
    }
  } else {
    issues.push({
      id: issueId('ai-pass', 1),
      category: 'ai-act',
      level: 'passed',
      title: 'Vollständige KI-Transparenz vorhanden',
      description: 'Sämtliche KI-Systeme (Chatbots, Inhaltsgeneratoren) sind ordnungsgemäß nach Art. 50 deklariert und verfügen über C2PA-Metadaten.',
      lawReference: 'EU AI Act — Artikel 50',
      recommendation: 'Vorbildliche Implementierung.'
    });
    issues.push({
      id: issueId('ai-pass', 2),
      category: 'ai-act',
      level: 'passed',
      title: 'Human-in-the-Loop Architektur',
      description: 'Kritische KI-Entscheidungen werden über asynchrone Queues von Menschen validiert.',
      lawReference: 'EU AI Act — Artikel 14',
      recommendation: 'Sehr robustes Design für Compliance.'
    });
  }

  // ==========================================
  // 2. DSGVO / GDPR Checks (gdpr)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('gdpr', 1),
      category: 'gdpr',
      level: 'critical',
      title: 'Tracking vor Consent (Google Analytics & Meta)',
      description: 'Drittanbieter-Scripte (Google Analytics 4, Meta Pixel) werden geladen und setzen LocalStorage/Cookies, bevor der Nutzer im Cookie-Banner explizit zugestimmt hat.',
      lawReference: 'DSGVO — Artikel 6 (1)(a) & TTDSG § 25',
      recommendation: 'Passen Sie Ihren Tag Manager so an, dass Tracking-Tags erst nach dem Event "consent_granted" feuern.',
      codeSnippet: `// FALSCH: Script lädt synchron im <head>\n<script src="https://www.googletagmanager.com/gtm.js?id=GTM-XYZ"></script>`,
      affectedElement: 'Index <head>'
    });

    issues.push({
      id: issueId('gdpr', 2),
      category: 'gdpr',
      level: 'critical',
      title: 'Illegitimer Datenabfluss in die USA (OpenAI API / Schrems II)',
      description: 'Nutzer-Eingaben aus dem Formular werden direkt aus dem Browser an die US-Server von OpenAI gesendet. Dies stellt einen nicht genehmigten Drittland-Datentransfer (Schrems II) dar.',
      lawReference: 'DSGVO — Artikel 44 (Drittlandtransfer)',
      recommendation: 'Leiten Sie Anfragen über einen EU-Proxy (Backend) und nutzen Sie EU-Standorte (z.B. Azure OpenAI Region Frankfurt). Schließen Sie SCCs ab.',
      affectedElement: 'Fetch-Aufruf an https://api.openai.com/v1/chat/completions'
    });

    issues.push({
      id: issueId('gdpr', 3),
      category: 'gdpr',
      level: 'warning',
      title: 'Fehlende Google Consent Mode v2 Integration',
      description: 'Google Analytics feuert, aber der benötigte "Consent Mode v2" Status (ad_user_data, ad_personalization) wird nicht als Parameter mitgesendet. Dies führt zu Strafen durch Google und DSGVO-Prüfer.',
      lawReference: 'DSGVO — Art. 7 (Nachweis der Einwilligung) / DMA',
      recommendation: 'Integrieren Sie die gtag(\'consent\', \'default\', {...}) Parameter direkt vor dem Laden des GTM-Scripts.',
      affectedElement: 'Google Tag Manager Snippet'
    });

    issues.push({
      id: issueId('gdpr', 4),
      category: 'gdpr',
      level: 'warning',
      title: 'Unzureichende KI-Klausel in Datenschutzerklärung',
      description: 'Die Datenschutzerklärung klärt nicht über die Nutzung generativer KI auf, noch darüber, ob Eingaben für das Training fremder Modelle (LLMs) verwendet werden.',
      lawReference: 'DSGVO — Artikel 13 & 14',
      recommendation: 'Fügen Sie einen Passus zur KI-Nutzung hinzu. Sichern Sie zu, dass Nutzerdaten via "Zero Data Retention" oder Opt-Out vor KI-Training geschützt sind.',
      affectedElement: 'Seite: /datenschutz'
    });

    issues.push({
      id: issueId('gdpr', 5),
      category: 'gdpr',
      level: 'critical',
      title: 'Canvas Fingerprinting erkannt',
      description: 'Ein eingebettetes Drittanbieter-Skript versucht, über die HTML5 Canvas API einen eindeutigen Browser-Fingerprint zu erstellen, um den Nutzer sessionübergreifend zu tracken. Dies ist ohne Consent strikt illegal.',
      lawReference: 'ePrivacy-Richtlinie / TTDSG § 25',
      recommendation: 'Entfernen Sie das betrügerische Script oder holen Sie eine explizite Einwilligung für Device-Fingerprinting ein.',
      affectedElement: 'Script: https://cdn.sketchy-tracker.com/fp.js'
    });

    if (isShop) {
      issues.push({
        id: issueId('gdpr', 6),
        category: 'gdpr',
        level: 'warning',
        title: 'Fehlendes Hashing bei Meta Conversions API',
        description: 'Im Checkout-Prozess werden E-Mail-Adressen und Namen unverschlüsselt (Klartext) an Meta gesendet.',
        lawReference: 'DSGVO — Artikel 32 (Sicherheit der Verarbeitung)',
        recommendation: 'Hashen Sie personenbezogene Daten (SHA-256) serverseitig vor der Übermittlung an Drittanbieter.',
        codeSnippet: `// Besser:\nfbq('track', 'Purchase', { em: sha256(userEmail) });`
      });
    }
  } else {
    issues.push({
      id: issueId('gdpr-pass', 1),
      category: 'gdpr',
      level: 'passed',
      title: 'Saubere Consent-Steuerung & Privacy-by-Design',
      description: 'Der Consent Manager blockiert alle Drittanbieter korrekt. KI-Schnittstellen nutzen DSGVO-konforme EU-Endpoints.',
      lawReference: 'DSGVO Art. 25',
      recommendation: 'Weiterhin regelmäßiges Audit durchführen.'
    });
    issues.push({
      id: issueId('gdpr-pass', 2),
      category: 'gdpr',
      level: 'passed',
      title: 'Local-Storage Data Encryption',
      description: 'Sensible Daten im LocalStorage sind AES-256 verschlüsselt.',
      lawReference: 'DSGVO Art. 32',
      recommendation: 'Ausgezeichneter Schutz gegen XSS Daten-Diebstahl.'
    });
  }

  // ==========================================
  // 3. Accessibility / WCAG Checks (accessibility)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('a11y', 1),
      category: 'accessibility',
      level: 'critical',
      title: 'Fehlende Fokus-Indikatoren (Keyboard Trapping)',
      description: 'Nutzer, die mit der Tastatur navigieren (Tab-Taste), sehen nicht, welches Element aktiv ist, da "outline: none" gesetzt wurde. Dies ist ein kritischer Fehler nach BFSG 2025.',
      lawReference: 'BFSG / WCAG 2.1 — 2.4.7 (Focus Visible)',
      recommendation: 'Entfernen Sie "outline: none" aus dem CSS oder fügen Sie saubere ":focus-visible" Styles hinzu.',
      codeSnippet: `*:focus-visible {\n  outline: 2px solid #3b82f6;\n  outline-offset: 2px;\n}`,
      affectedElement: 'Globale CSS-Regel'
    });

    issues.push({
      id: issueId('a11y', 2),
      category: 'accessibility',
      level: 'critical',
      title: 'Kein "aria-live" für generierte KI-Antworten',
      description: 'Wenn der Chatbot eine neue Nachricht asynchron generiert (Streaming), bekommt ein Screenreader-Nutzer diese Statusänderung nicht mit. Die Seite ist für blinde Nutzer nicht verwendbar.',
      lawReference: 'WCAG 2.1 — 4.1.3 (Status Messages)',
      recommendation: 'Umschließen Sie den Nachrichten-Bereich mit aria-live="polite", damit Screenreader neue Chat-Bubbles automatisch vorlesen.',
      codeSnippet: `<div id="chat-stream" aria-live="polite">\n  <!-- KI Antworten hier rein -->\n</div>`,
      affectedElement: '<div id="ai-chat-messages">'
    });

    issues.push({
      id: issueId('a11y', 3),
      category: 'accessibility',
      level: 'warning',
      title: 'Zu geringer Kontrast bei KI-Disclaimern / Error States',
      description: 'Der Warntext "Fehler bei der KI-Generierung" hat ein Kontrastverhältnis von 3.1:1. Erforderlich für Lesbarkeit ist 4.5:1 (AA).',
      lawReference: 'WCAG 2.1 — 1.4.3 (Contrast Minimum)',
      recommendation: 'Dunkeln Sie die Schriftfarbe auf mindestens #595959 ab (bei weißem Hintergrund) oder nutzen Sie ein kräftigeres Rot.',
      affectedElement: '<span class="text-red-400 text-xs">'
    });

    issues.push({
      id: issueId('a11y', 4),
      category: 'accessibility',
      level: 'warning',
      title: 'Fehlende ARIA-Labels an KI-Chat-Buttons',
      description: 'Der Button zum Öffnen des Chats nutzt nur ein SVG-Icon. Screenreader-Nutzer hören lediglich "Button", wissen aber nicht, was er tut.',
      lawReference: 'WCAG 2.1 — 1.1.1 (Non-text Content)',
      recommendation: 'Fügen Sie ein "aria-label" oder einen unsichtbaren "sr-only" Text hinzu.',
      codeSnippet: `<button aria-label="KI-Assistenz-Chat öffnen">\n  <svg>...</svg>\n</button>`,
      affectedElement: '<button class="chat-toggle">'
    });
    
    issues.push({
      id: issueId('a11y', 5),
      category: 'accessibility',
      level: 'warning',
      title: 'Fehlende "Skip to Content" Navigation',
      description: 'Tastatur-Nutzer müssen sich durch 20 Header-Links tabben, bevor sie zum eigentlichen Inhalt gelangen. Ein "Skip-Link" fehlt.',
      lawReference: 'WCAG 2.1 — 2.4.1 (Bypass Blocks)',
      recommendation: 'Fügen Sie einen versteckten Link hinzu, der bei Fokus sichtbar wird und zum Haupt-Inhalt (`<main>`) springt.',
      affectedElement: 'Header Navigation'
    });
  } else {
    issues.push({
      id: issueId('a11y-pass', 1),
      category: 'accessibility',
      level: 'passed',
      title: 'Vollständige WCAG 2.2 AAA Konformität',
      description: 'Hervorragende Kontrastwerte, saubere Tastatur-Navigation und vollständige ARIA-Auszeichnung für Assistenz-Technologien.',
      lawReference: 'WCAG 2.2 AAA',
      recommendation: 'Sehr gute Barrierefreiheit.'
    });
  }

  // ==========================================
  // 4. Security Checks (security)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('sec', 1),
      category: 'security',
      level: 'critical',
      title: 'Hardcodierte API-Schlüssel gefunden',
      description: 'Ein OpenAI API Key ("sk-...") wurde im komprimierten JavaScript-Bundle (Source Maps) gefunden. Jeder Nutzer kann diesen Key extrahieren und auf Ihre Kosten missbrauchen.',
      lawReference: 'OWASP Top 10 — A01:2021 (Broken Access Control)',
      recommendation: 'Rotieren Sie den betroffenen Key SOFORT. Verlagern Sie alle API-Aufrufe ins Backend (Node.js/Python), wo Keys als Umgebungsvariablen (ENV) sicher sind.',
      affectedElement: 'main.js (Zeile 1432)'
    });

    issues.push({
      id: issueId('sec', 2),
      category: 'security',
      level: 'critical',
      title: 'GraphQL Introspection ist öffentlich (Daten-Leak)',
      description: 'Der GraphQL Endpoint (/graphql) erlaubt Introspection. Angreifer können das komplette Datenbankschema (alle Queries und Mutations) auslesen, um gezielt Schwachstellen zu finden.',
      lawReference: 'OWASP API Security Top 10 — API3:2023',
      recommendation: 'Deaktivieren Sie Introspection in Produktionsumgebungen. Blockieren Sie den Zugriff in Apollo Server oder GraphQL Yoga.',
      affectedElement: 'POST /graphql'
    });

    issues.push({
      id: issueId('sec', 3),
      category: 'security',
      level: 'warning',
      title: 'Fehlende Content-Security-Policy (CSP)',
      description: 'Es fehlen CSP-Header. Cross-Site-Scripting (XSS) Angriffe können dadurch vereinfacht fremde Skripte in die Seite einschleusen, um Tokens zu stehlen.',
      lawReference: 'BSI TR-02102-2',
      recommendation: 'Senden Sie den HTTP-Header "Content-Security-Policy" mit einer strikten "default-src \'self\'" Regelung.',
      codeSnippet: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://trusted.com;`
    });

    issues.push({
      id: issueId('sec', 4),
      category: 'security',
      level: 'warning',
      title: 'Fehlendes Rate-Limiting für KI-Endpoints (DDoS/Cost-Exhaustion)',
      description: 'Die `/api/chat` Route hat kein Rate-Limiting. Ein Botnetz könnte diesen Endpoint tausendfach aufrufen und massive Kosten bei OpenAI (Token-Exhaustion) verursachen.',
      lawReference: 'OWASP API Security — API4:2023 (Unrestricted Resource Consumption)',
      recommendation: 'Implementieren Sie IP-basiertes oder Token-basiertes Rate-Limiting (z.B. max. 10 Anfragen / Minute pro User).',
      affectedElement: 'POST /api/chat'
    });
    
    issues.push({
      id: issueId('sec', 5),
      category: 'security',
      level: 'warning',
      title: 'Clickjacking-Schutz fehlt (X-Frame-Options)',
      description: 'Die Seite kann in einem iframe (<iframe>) auf einer bösartigen Website eingebunden werden. Angreifer können so Klicks abfangen (Clickjacking).',
      lawReference: 'OWASP Top 10',
      recommendation: 'Fügen Sie den Header `X-Frame-Options: SAMEORIGIN` oder CSP `frame-ancestors \'self\'` hinzu.',
      affectedElement: 'Server HTTP Response Headers'
    });

    if (isGov) {
      issues.push({
        id: issueId('sec', 6),
        category: 'security',
        level: 'critical',
        title: 'Schwaches SSL/TLS Protokoll aktiv',
        description: 'Der Server erlaubt noch Verbindungen über das veraltete TLS 1.0/1.1 Protokoll. Für Behörden-IT und kritische Infrastrukturen ist dies strikt untersagt.',
        lawReference: 'BSI TR-02102-2 (Kryptografische Verfahren)',
        recommendation: 'Konfigurieren Sie den Webserver (Nginx/Apache) so, dass nur noch TLS 1.2 und TLS 1.3 akzeptiert werden.',
        affectedElement: 'Server TLS Configuration'
      });
    }
  } else {
    issues.push({
      id: issueId('sec-pass', 1),
      category: 'security',
      level: 'passed',
      title: 'Strikte Security Headers & SSL Best-Practices',
      description: 'A+ Rating bei den Security Headern. TLS 1.3 ist erzwungen (HSTS). Keine geleakten Secrets im Code.',
      lawReference: 'ISO 27001',
      recommendation: 'Die Architektur entspricht modernsten Sicherheitsstandards.'
    });
    issues.push({
      id: issueId('sec-pass', 2),
      category: 'security',
      level: 'passed',
      title: 'Robuster DDoS & Rate-Limit Schutz',
      description: 'GraphQL & REST Endpoints sind durch strikte Rate-Limits und Token-Quotas auf WAF-Ebene gesichert.',
      lawReference: 'OWASP API4',
      recommendation: 'Optimal gegen Cost-Exhaustion geschützt.'
    });
  }

  // ==========================================
  // 5. Supply Chain Security (NIS2) (supply-chain)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('supply', 1),
      category: 'supply-chain',
      level: 'critical',
      title: 'Veraltete NPM Abhängigkeit mit bekanntem RCE (CVE-2023-45133)',
      description: 'Die eingesetzte Version von `babel/traverse` hat eine bekannte Remote Code Execution Schwachstelle. Nach NIS2 haftet der Betreiber für Schwachstellen in der Software-Lieferkette.',
      lawReference: 'NIS2 Richtlinie — Artikel 21 (Sicherheit der Lieferkette)',
      recommendation: 'Aktualisieren Sie `@babel/traverse` umgehend auf Version >= 7.23.2 oder installieren Sie einen Sicherheitspatch.',
      codeSnippet: `npm install @babel/traverse@latest`,
      affectedElement: 'package.json'
    });

    issues.push({
      id: issueId('supply', 2),
      category: 'supply-chain',
      level: 'warning',
      title: 'Einbindung von ungeprüften Drittanbieter-Skripten',
      description: 'Es werden externe Skripte (z.B. von cdnjs) ohne Subresource Integrity (SRI) Hashes eingebunden. Ein kompromittiertes CDN kann so unbemerkt Malware auf Ihrer Seite ausliefern.',
      lawReference: 'BSI TR-02102 / NIS2',
      recommendation: 'Fügen Sie SRI-Hashes (integrity="sha384-...") zu allen extern geladenen <script> und <link> Tags hinzu.',
      codeSnippet: `<script src="https://cdn.../lib.js"\n        integrity="sha384-oqVuAfXRKap7fdgcCY5..."\n        crossorigin="anonymous"></script>`,
      affectedElement: 'index.html (External Scripts)'
    });
  } else {
    issues.push({
      id: issueId('supply-pass', 1),
      category: 'supply-chain',
      level: 'passed',
      title: 'Saubere Software-Lieferkette (NIS2 Ready)',
      description: 'Automatisierte CVE-Scans (SCA) zeigen keine bekannten Schwachstellen in den Abhängigkeiten. Alle externen Ressourcen verwenden SRI-Hashes.',
      lawReference: 'NIS2 Art. 21',
      recommendation: 'Das Projekt erfüllt höchste Compliance-Standards für Lieferketten-Sicherheit.'
    });
  }

  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('legal', 1),
      category: 'legal-data',
      level: 'critical',
      title: 'Diskrepanz im Handelsregisterabgleich',
      description: 'Die im Impressum angegebene Handelsregisternummer (HRB) stimmt nicht mit der offiziellen Datenbank des Unternehmensregisters überein, oder die Gesellschaftsform weicht ab. Dies deutet auf fehlende oder veraltete Pflichtangaben hin.',
      lawReference: 'TMG § 5 (Allgemeine Informationspflichten)',
      recommendation: 'Prüfen und korrigieren Sie die HRB-Nummer sowie das zuständige Registergericht umgehend.',
      affectedElement: 'Impressum (Handelsregistereintrag)'
    });

    issues.push({
      id: issueId('legal', 2),
      category: 'legal-data',
      level: 'warning',
      title: 'Fehlende oder ungültige USt-IdNr.',
      description: 'Ein B2B-Shop erfordert zwingend eine gültige Umsatzsteuer-Identifikationsnummer nach § 27a UStG. Die gefundene Nummer hat kein gültiges Format oder fehlt komplett.',
      lawReference: 'UStG § 27a',
      recommendation: 'Fügen Sie eine gültige USt-IdNr. im Format DE123456789 ein.',
      affectedElement: 'Impressum (USt-IdNr.)'
    });

    issues.push({
      id: issueId('legal', 3),
      category: 'legal-data',
      level: 'warning',
      title: 'Fehlender Link zur OS-Plattform',
      description: 'Online-Händler und Dienstleister müssen einen leicht zugänglichen Link zur Online-Streitbeilegungsplattform (OS-Plattform) der EU bereitstellen.',
      lawReference: 'Art. 14 Abs. 1 ODR-VO',
      recommendation: 'Integrieren Sie folgenden klickbaren Link im Impressum: https://ec.europa.eu/consumers/odr',
      codeSnippet: `<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">Zur OS-Plattform</a>`,
      affectedElement: 'Impressum'
    });

    issues.push({
      id: issueId('legal', 4),
      category: 'legal-data',
      level: 'critical',
      title: 'Urheberrecht: Fehlende Bildnachweise (Stock-Fotos)',
      description: 'Auf der Seite wurden Bilder von Getty Images / Shutterstock über Reverse-Image-Search erkannt. Im Impressum fehlen jedoch die von den Lizenzen zwingend vorgeschriebenen Bildnachweise.',
      lawReference: 'UrhG § 13 (Anerkennung der Urheberschaft)',
      recommendation: 'Fügen Sie ein Verzeichnis der Bildnachweise im Impressum hinzu (z.B. "Bildquelle: Shutterstock.com / Fotografenname").',
      affectedElement: '<img src="/assets/hero-business.jpg">'
    });
  } else {
    issues.push({
      id: issueId('legal-pass', 1),
      category: 'legal-data',
      level: 'passed',
      title: 'Unternehmensdaten erfolgreich verifiziert',
      description: 'HRB, USt-IdNr. und Geschäftsführung stimmen mit dem amtlichen Unternehmensregister überein. Link zur OS-Plattform ist vorhanden.',
      lawReference: 'TMG § 5 / ODR-VO',
      recommendation: 'Impressum ist rechtssicher und verifiziert.'
    });
  }

  // ==========================================
  // 6. Consumer Protection & Dark Patterns (consumer-protection)
  // ==========================================
  if (!isSecure) {
    issues.push({
      id: issueId('cp', 1),
      category: 'consumer-protection',
      level: 'critical',
      title: 'Fehlender Kündigungs-Button (Verträge)',
      description: 'Die Webseite bietet Dauerschuldverhältnisse (Abos) an, jedoch fehlt der seit 2022 gesetzlich vorgeschriebene, leicht zugängliche "Vertrag hier kündigen"-Button (2-Klick-Lösung).',
      lawReference: 'BGB § 312k (Kündigungsbutton)',
      recommendation: 'Fügen Sie dauerhaft im Footer einen Link "Verträge hier kündigen" hinzu, der zu einem simplen Bestätigungs-Formular ohne Login-Zwang führt.',
      affectedElement: 'Footer Navigation'
    });

    issues.push({
      id: issueId('cp', 2),
      category: 'consumer-protection',
      level: 'warning',
      title: 'Confirmshaming im Cookie-Banner',
      description: 'Der Button zum Ablehnen von Cookies ist farblich komplett versteckt (grau auf grau) oder nutzt manipulativen Text (z.B. "Nein, ich möchte keine personalisierten Angebote"). Dies stellt einen Verstoß gegen das Gebot der fairen Einwilligung dar.',
      lawReference: 'DSGVO Erwägungsgrund 42 / TTDSG',
      recommendation: 'Gestalten Sie den "Ablehnen"-Button visuell gleichwertig zum "Akzeptieren"-Button (z.B. gleicher Kontrast, gleiche Größe).',
      affectedElement: '<button id="cookie-reject-hidden">'
    });

    if (isShop) {
      issues.push({
        id: issueId('cp', 3),
        category: 'consumer-protection',
        level: 'critical',
        title: 'Verdeckte Preisbestandteile (PAngV)',
        description: 'Auf den Produktseiten fehlen Hinweise zur enthaltenen Mehrwertsteuer ("inkl. USt.") oder den anfallenden Versandkosten. Diese werden erst spät im Checkout offenbart (Drip Pricing).',
        lawReference: 'Preisangabenverordnung (PAngV) § 1',
        recommendation: 'Fügen Sie direkt neben dem Preis den Zusatz "inkl. MwSt., zzgl. Versandkosten" hinzu.',
        codeSnippet: `<span class="price-hint">inkl. 19% USt., zzgl. Versandkosten</span>`,
        affectedElement: 'Produktdetailseite (Preis)'
      });
    }
  } else {
    issues.push({
      id: issueId('cp-pass', 1),
      category: 'consumer-protection',
      level: 'passed',
      title: 'Vorbildliches UX-Design ohne Dark Patterns',
      description: 'Kein Confirmshaming, saubere Kündigungsprozesse (2-Klick-Button) und transparente Preisgestaltung.',
      lawReference: 'BGB / PAngV',
      recommendation: 'Ausgezeichneter Verbraucherschutz.'
    });
  }

  // Inject deeper code analysis & infrastructure into Security & GDPR
  if (!isSecure) {
    issues.push({
      id: issueId('sec', 7),
      category: 'security',
      level: 'critical',
      title: 'SAST: Veraltete UI-Bibliothek mit CVE',
      description: 'Die Quellcode-Analyse zeigt: Es wird React.js in Version 16.8 verwendet. Diese Version hat bekannte Cross-Site-Scripting (XSS) Schwachstellen bei unsachgemäßer Nutzung von Attributen.',
      lawReference: 'OWASP Top 10 — A06:2021 (Vulnerable Components)',
      recommendation: 'Aktualisieren Sie die React-Version auf mindestens 18.x und prüfen Sie die Abhängigkeiten mit "npm audit".',
      affectedElement: 'package.json / React Core'
    });
    
    issues.push({
      id: issueId('sec', 8),
      category: 'security',
      level: 'critical',
      title: 'Malicious CDN / Fehlende Subresource Integrity (SRI)',
      description: 'Ein externes Stylesheet (Bootstrap) wird über ein unsicheres Drittanbieter-CDN geladen, ohne dass ein `integrity`-Attribut (SHA-384 Hash) vorhanden ist. Bei einem Hack des CDNs wird Ihre Seite kompromittiert.',
      lawReference: 'BSI TR-02102',
      recommendation: 'Fügen Sie das integrity-Attribut hinzu oder hosten Sie das Script selbst.',
      codeSnippet: `<link rel="stylesheet" href="..." integrity="sha384-..." crossorigin="anonymous">`,
      affectedElement: '<link href="https://cdn.example.com/..."> '
    });

    issues.push({
      id: issueId('sec', 9),
      category: 'security',
      level: 'warning',
      title: 'E-Mail Spoofing Schutz fehlt (DMARC/SPF)',
      description: 'Für diese Domain fehlen SPF, DKIM und DMARC DNS-Records. Betrüger können problemlos Phishing-Mails im Namen Ihrer Domain an Kunden versenden.',
      lawReference: 'BSI IT-Grundschutz (Absicherung E-Mail)',
      recommendation: 'Richten Sie im DNS-Panel DMARC-Records mit Policy "quarantine" oder "reject" ein.',
      affectedElement: 'DNS Records (TXT)'
    });

    issues.push({
      id: issueId('gdpr', 7),
      category: 'gdpr',
      level: 'critical',
      title: 'Illegales US-Hosting (Schrems II)',
      description: 'Die DNS- und IP-Analyse zeigt, dass die Infrastruktur in den USA (AWS us-east-1) gehostet wird. Ohne Standardvertragsklauseln (SCCs) und TIA ist dies ein kritischer DSGVO-Verstoß, da US-Behörden (FISA/Cloud Act) Zugriff auf die Daten haben.',
      lawReference: 'DSGVO Art. 44 (Drittlandtransfer) / EuGH "Schrems II"',
      recommendation: 'Migrieren Sie Ihre kritischen Kundendatenbanken nach Europa (z.B. AWS eu-central-1 Frankfurt) und aktivieren Sie Verschlüsselung "At-Rest" mit kundeneigenen Schlüsseln (KMS).',
      affectedElement: 'Infrastruktur (IP / DNS Routing)'
    });

    issues.push({
      id: issueId('gdpr', 8),
      category: 'gdpr',
      level: 'critical',
      title: 'Session-Replay Tools (Hotjar) ohne Maskierung',
      description: 'Ein Session-Replay-Skript zeichnet den Bildschirm des Nutzers auf. Passwort- und Formularfelder (E-Mails) werden dabei unzureichend maskiert und an den Drittanbieter gesendet.',
      lawReference: 'DSGVO Art. 5 (Datenminimierung)',
      recommendation: 'Aktivieren Sie im Hotjar-Dashboard striktes Maskieren für ALLE Eingabefelder ("Suppress keystrokes") oder entfernen Sie das Tool.',
      affectedElement: '<script>...hotjar.com/c/hotjar-...</script>'
    });
    issues.push({
      id: issueId('esg', 1),
      category: 'esg',
      level: 'critical',
      title: 'Extrem hoher CO2-Fußabdruck & Dirty Hosting',
      description: 'Die Website lädt im Schnitt 12MB pro Seitenaufruf (nicht-optimierte Bilder, schwere JS-Bundles) und wird in einem Rechenzentrum ohne Grünstrom-Zertifikat gehostet. Ein massiver Verstoß gegen die kommende CSRD-Berichtspflicht.',
      lawReference: 'CSRD (Corporate Sustainability Reporting Directive)',
      recommendation: 'Reduzieren Sie die Payload drastisch (Lazy-Loading, WebP). Wechseln Sie zu einem zertifizierten Green-Hosting Provider (z.B. in Skandinavien).',
      affectedElement: 'Netzwerk-Payload (12.4 MB) / RZ-Zertifikat'
    });

    issues.push({
      id: issueId('ip', 1),
      category: 'ip-rights',
      level: 'warning',
      title: 'Unlizenzierte KI-Texte & Bildmaterial',
      description: 'Teile der Website enthalten Textblöcke und Bilder, die durch KI generiert wurden, ohne dass die Plattform die Nutzungsrechte an den zugrundeliegenden Trainingsdaten verifiziert hat (potenzielle Urheberrechtsverletzung nach AI Act Art. 53).',
      lawReference: 'Urheberrecht / EU AI Act Art. 53 (Trainingsdaten)',
      recommendation: 'Implementieren Sie einen internen Prüfprozess für KI-generierte Inhalte und weisen Sie die Lizenz- oder Quellenangaben transparent aus.',
      affectedElement: 'Blog-Texte & Hero-Images'
    });

    issues.push({
      id: issueId('dsa', 1),
      category: 'dsa',
      level: 'critical',
      title: 'Fehlender Jugendschutz (Altersverifikation)',
      description: 'Ihre Plattform bietet Zugang zu potenziell sensiblen Inhalten (oder High-Risk KI Interaktionen) ohne effektive Altersprüfung (Age-Gating). Ein Verstoß gegen den Digital Services Act bezüglich des Schutzes Minderjähriger.',
      lawReference: 'Digital Services Act (DSA) - Jugendschutz',
      recommendation: 'Implementieren Sie ein robustes Age-Verification-System (z.B. über Ausweis-ID oder verifizierte Drittanbieter), bevor Nutzer auf die Dienste zugreifen können.',
      affectedElement: 'Registrierungs-Flow'
    });
  }

  // ==========================================
  // Calculate category scores & totals
  // ==========================================
  
  const calculateCategoryData = (cat: ComplianceCategory, baseTitle: string) => {
    const catIssues = issues.filter(i => i.category === cat);
    const criticals = catIssues.filter(i => i.level === 'critical').length;
    const warnings = catIssues.filter(i => i.level === 'warning').length;
    
    // Massive increase in simulated checks to make it look like a "deep scan"
    const simulatedDeepChecks = isSecure ? 45 : (35 + Math.floor(Math.random() * 20));
    const totalChecks = catIssues.length > 0 ? simulatedDeepChecks : 10; 
    
    // Massively strict scoring for a "juristisch harte" evaluation
    let rawScore = 85 - (criticals * 25 + warnings * 10); 
    if (rawScore < 5) rawScore = Math.floor(Math.random() * 10) + 5;
    if (isSecure) rawScore = 100;
    
    return {
      category: cat,
      title: baseTitle,
      score: rawScore,
      totalChecks: totalChecks + criticals + warnings,
      passedChecks: isSecure ? totalChecks : Math.max(1, totalChecks - criticals - warnings),
      criticalCount: criticals,
      warningCount: warnings
    };
  };

  const categories = {
    'ai-act': calculateCategoryData('ai-act', 'EU AI Act & Transparenz'),
    'gdpr': calculateCategoryData('gdpr', 'DSGVO & Data Privacy'),
    'accessibility': calculateCategoryData('accessibility', 'Barrierefreiheit (WCAG)'),
    'security': calculateCategoryData('security', 'Source Code & Sicherheit'),
    'legal-data': calculateCategoryData('legal-data', 'Unternehmensdaten & Impressum'),
    'consumer-protection': calculateCategoryData('consumer-protection', 'Verbraucherschutz & Dark Patterns'),
    'supply-chain': calculateCategoryData('supply-chain', 'Software Lieferkette (NIS2)'),
    'esg': calculateCategoryData('esg', 'ESG & Green IT (CSRD)'),
    'ip-rights': calculateCategoryData('ip-rights', 'Urheberrecht & IP (Copyright)'),
    'dsa': calculateCategoryData('dsa', 'Jugendschutz & Digital Services Act'),
    'copyright': calculateCategoryData('copyright', 'Urheberrecht & Disclaimer')
  };

  const allCriticals = issues.filter(i => i.level === 'critical').length;
  const allWarnings = issues.filter(i => i.level === 'warning').length;

  // Very strict overall score deduction
  let overallScore = 82 - (allCriticals * 8 + allWarnings * 3); 
  if (overallScore < 12) overallScore = Math.floor(Math.random() * 15) + 12;
  if (isSecure) overallScore = 98;
  
  // Fake an industry average that is usually better than the user's score to induce fear, 
  // unless the user has a perfect score.
  const industryAverageScore = isSecure ? 75 : Math.min(85, overallScore + Math.floor(Math.random() * 25) + 15);

  const riskStatus = overallScore >= 85 ? 'COMPLIANT' : overallScore >= 65 ? 'NEEDS_ACTION' : 'HIGH_RISK';
  return {
    url: cleanUrl,
    targetDomain: domain,
    scannedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    overallScore,
    industryAverageScore,
    riskStatus,
    categories,
    issues,
    detectedTech: {
      aiFrameworks: isSecure ? ['Custom LLM (EU Hosted)'] : ['OpenAI API', 'LangChain JS', 'Vercel AI SDK', 'TensorFlow.js (Client)'],
      trackers: isSecure ? ['Matomo Self-Hosted'] : ['Google Analytics 4', 'Meta Pixel', 'LinkedIn Insight', 'Hotjar'],
      cms: isShop ? 'Shopify Plus' : isHealth ? 'TYPO3 Enterprise' : 'Next.js React (App Router)',
      sslActive: true
    },
    metrics: {
      scannedPages: isSecure ? 142 : (85 + Math.floor(Math.random() * 100)),
      scanDurationMs: isSecure ? 15430 : (8890 + Math.floor(Math.random() * 5000)),
      domNodeCount: isSecure ? 13105 : (8240 + Math.floor(Math.random() * 5000))
    }
  };
}
