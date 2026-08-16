# GuardAI Master Build Guide — Living Engineering Bible

> **Verbindliche, GuardAI-spezifische Anleitung vom heutigen Repository bis zu einer echten, sicheren und öffentlich betreibbaren SaaS.**
>
> Dieses Dokument ist die zentrale technische Quelle für GuardAI. Es ist **lebend**: Wenn wir beim Bau neue Erkenntnisse gewinnen, darf und soll es angepasst werden. Änderungen müssen aber begründet sein und dürfen die Grundprinzipien unten nicht stillschweigend aufweichen.

---

## 0. So benutzen wir diese Anleitung

Diese Datei ist **keine Wunschliste** und kein Marketing-Dokument. Sie beschreibt die Reihenfolge, in der GuardAI gebaut wird.

### Grundregel

Wir bauen keine weitere große UI-Demo-Funktion, solange die bereits sichtbaren Kernfunktionen nicht durch echte Daten, echte Scanner, Authentifizierung, Persistenz, Security, Tests und Deployment getragen werden.

### Jede Phase ist erst fertig, wenn

- ihr Ziel umgesetzt ist,
- die Acceptance Criteria erfüllt sind,
- relevante Tests existieren,
- keine bekannten P0/P1-Fehler offen sind,
- Dokumentation aktualisiert wurde,
- und die nächste Phase auf einer stabilen Basis aufbauen kann.

### GuardAI-Entwicklungsprinzip

```text
Erst wahr machen.
Dann stabil machen.
Dann sicher machen.
Dann skalieren.
Dann Enterprise-Funktionen ausbauen.
```

---

# 1. Produktdefinition

## 1.1 Was GuardAI werden soll

GuardAI wird eine **Technical Compliance Evidence & Risk Platform** für:

- Websites und Web-Apps,
- GitHub-/Git-Repositories,
- ausgewählte Dokumente und Assets,
- wiederkehrendes Monitoring,
- technische Compliance-Evidenz,
- Security-Risiken,
- Accessibility-Risiken,
- Privacy-/Consent-Risiken,
- AI-Governance-/AI-Act-Evidenz,
- Berichte und Remediation-Workflows.

GuardAI soll:

1. reale technische Evidenz sammeln,
2. deterministische Checks ausführen,
3. Risiken erkennen,
4. Ergebnisse nachvollziehbar begründen,
5. Findings mit Regeln/Anforderungen verknüpfen,
6. Severity und Confidence getrennt bewerten,
7. konkrete Remediation liefern,
8. Scan-Historie speichern,
9. Veränderungen überwachen,
10. Team-Workflows ermöglichen,
11. Berichte aus realen Scan-Daten erzeugen,
12. optional ausgewählte Statusinformationen öffentlich darstellen,
13. AI zur Erklärung/Klassifikation nutzen — nicht als alleinige Wahrheitsquelle.

## 1.2 Was GuardAI nicht behaupten darf

Solange keine dafür geeignete rechtliche und organisatorische Grundlage besteht, darf GuardAI nicht so dargestellt werden, als wäre es:

- Behörde,
- offizielle Zertifizierungsstelle,
- Anwaltskanzlei,
- Ersatz für Rechtsberatung,
- Garantie für DSGVO-Konformität,
- Garantie für EU-AI-Act-Konformität,
- Garantie für ISO/SOC2/NIS2-Konformität,
- Garantie für vollständige IT-Sicherheit.

Bevorzugte Begriffe:

- `Automated technical compliance screening`
- `Potential issue detected`
- `Technical evidence`
- `Requires review`
- `Not assessed`
- `No issue detected by this automated check`
- `Scan coverage`
- `Confidence`

Zu vermeiden:

- `100% compliant`
- `officially certified`
- `Verification Authority`
- `rechtssicher garantiert`
- `keine Sicherheitslücken`

## 1.3 Evidence-first-Prinzip

Jedes ernsthafte Finding muss diese Kette besitzen:

```text
Target
  ↓
Scanner / Detector
  ↓
Raw Evidence
  ↓
Rule
  ↓
Finding
  ↓
Requirement Mapping
  ↓
Severity + Confidence
  ↓
Remediation
  ↓
Human Review State
```

Kann GuardAI nicht erklären, warum ein Ergebnis existiert, darf es nicht als verifizierte Tatsache erscheinen.

---

# 2. Zielkunden und Kern-Use-Cases

Wir bauen nicht für „alle Unternehmen gleichzeitig“.

## 2.1 MVP-Zielkunden

Priorität:

1. kleine und mittlere SaaS-/Web-Unternehmen,
2. Web-/Digitalagenturen mit mehreren Kundendomains,
3. technische Datenschutz-/Security-Verantwortliche,
4. Entwicklerteams, die vor einem Release technische Compliance-Risiken prüfen wollen.

## 2.2 Spätere Zielkunden

- größere Unternehmen,
- Compliance-/GRC-Teams,
- interne Audit-Teams,
- Security Teams,
- Beratungen mit Mandanten-Workspaces.

## 2.3 Primäre User Journeys

### Journey A — Website prüfen

```text
Registrieren
→ Workspace erstellen
→ Domain hinzufügen
→ Scan starten
→ Fortschritt sehen
→ Findings öffnen
→ Evidence prüfen
→ Remediation umsetzen
→ Finding als gelöst markieren
→ erneut scannen
```

### Journey B — Repository prüfen

```text
GitHub verbinden
→ Repository auswählen
→ Scan starten
→ Dependencies / Secrets / SAST / Config prüfen
→ Findings priorisieren
→ Fix umsetzen
→ Re-Scan
```

### Journey C — Agentur

```text
Workspace
→ mehrere Kundenziele
→ regelmäßige Scans
→ Reports exportieren
→ Kundenstatus vergleichen
→ Alerts erhalten
```

### Journey D — Monitoring

```text
Target aktivieren
→ Scan-Zeitplan wählen
→ Baseline speichern
→ Änderung erkennen
→ neues Finding erzeugen
→ Benachrichtigung senden
```

---

# 3. Aktueller Repository-Zustand

Das Repository ist heute ein **starker Produkt-/UI-Prototyp mit ersten Backend-Ansätzen**, aber noch keine Production-SaaS.

## 3.1 Frontend heute

Vorhanden:

- React + TypeScript + Vite,
- Tailwind,
- UI-Komponenten,
- Landing Page,
- URL-/File-Input,
- Scan Progress,
- Compliance Dashboard,
- Printable Report,
- LeadGen,
- Pricing,
- Checkout Simulation,
- User Dashboard,
- AI Counsel,
- Audit Hub,
- Trust Center,
- Badge Generator,
- Document Generator,
- Templates Hub,
- Integrations Hub,
- Policy Manager,
- TrueSight.

Viele dieser Flächen sind heute Demo-/Mock-getrieben.

## 3.2 Backend heute

Vorhanden:

- Express-Server,
- `POST /api/scan`,
- erste Website-Prüfung,
- erste GitHub-Prüfung,
- Gemini-Analyse,
- `POST /api/scan-file`,
- PDF-/Text-Extraktion,
- einige Security-Header-Checks,
- Helmet,
- Rate Limit,
- erste Zod-Nutzung.

## 3.3 Aktuell bekannte P0-Probleme

- Frontend/Backend verwenden unterschiedliche Kategorienamen.
- Statuswerte sind nicht vereinheitlicht.
- Frontend verwendet hart codiertes `localhost:3001`.
- Backend importiert Pakete, die nicht vollständig in `server/package.json` stehen.
- User-gesteuertes URL-Fetching ist noch nicht ausreichend gegen SSRF abgesichert.
- Upload-Limits/-Typen sind serverseitig nicht vollständig abgesichert.
- Mehrere App-Views werden doppelt gerendert.
- `score || fallback` kann einen echten Score `0` überschreiben.
- Mock-Fallbacks haben nicht dieselbe Datenform wie echte Antworten.
- UI behauptet teilweise Fähigkeiten, die technisch noch simuliert sind.
- LeadGen kann Erfolg anzeigen, obwohl der Webhook fehlschlägt.
- Payment ist simuliert.
- TrueSight ist simuliert.
- AI Counsel ist überwiegend simuliert.
- Audit Hub / Policy / Integrationen enthalten Mock-Zustände.
- Repository enthält versionierte npm-Cache-Verzeichnisse.
- `.gitignore` ist für Secrets, Uploads, Cache und Coverage noch zu schwach.
- Es gibt noch keine vollständige CI-/Test-Pipeline.

---

# 4. GuardAI Repo-Inventar: Was bleibt, was wird umgebaut?

Diese Matrix ist speziell für den aktuellen Stand des Repositories.

| Bereich / Datei | Status | Entscheidung |
|---|---|---|
| `src/App.tsx` | Prototype | **REFACTOR** — Routing, Auth-Guards, doppelte Views entfernen |
| `src/main.tsx` | brauchbar | **KEEP + SMALL REFACTOR** |
| `src/data/mockScanEngine.ts` | Mock-Kern | **REPLACE AS SOURCE OF TRUTH**; als Demo-/Fixture-Referenz behalten |
| `src/types/scanner.ts` | frühes Modell | **REFACTOR** zu gemeinsamen Contracts |
| `ComplianceDashboard.tsx` | gutes UI, Mock-Annahmen | **KEEP UI / REBUILD DATA LAYER** |
| `ScanProgressModal.tsx` | visuell gut, simuliert | **KEEP UI / CONNECT TO REAL JOB EVENTS** |
| `PrintableReport.tsx` | Prototype | **REBUILD FROM STORED EVIDENCE** |
| `LeadGenModal.tsx` | Prototype | **REFACTOR** mit echtem Backend, Consent, Failure-State |
| `CheckoutSimulation.tsx` | Simulation | **REPLACE** mit echtem Billing |
| `UserDashboard.tsx` | Mock | **KEEP DESIGN / REBUILD DATA** |
| `AiCounsel.tsx` | Mock | **LATER + REBUILD** mit Workspace-Kontext |
| `AuditHub.tsx` | Mock | **POST-MVP** |
| `PublicTrustCenter.tsx` | Mock | **KEEP DESIGN / REBUILD AFTER REAL EVIDENCE** |
| `BadgeGenerator.tsx` | Mock | **REBUILD AFTER TRUST CENTER** |
| `DocumentGenerator.tsx` | Mock | **POST-MVP**; keine „rechtsgültig“-Claims |
| `TemplatesHub.tsx` | Content Prototype | **REVIEW + VERSION LEGAL SOURCES** |
| `IntegrationsHub.tsx` | Mock | **POST-MVP**; echte OAuth/API-Verbindungen |
| `PolicyManager.tsx` | Mock | **POST-MVP** |
| `TrueSight.tsx` | Simulation | **LABS / POST-MVP** bis echte Modelle/Evals existieren |
| `UrlInputHero.tsx` | brauchbar | **KEEP + CONNECT REAL OPTIONS** |
| `LandingPage.tsx` | starkes Design | **KEEP DESIGN / CORRECT CLAIMS** |
| `server/index.js` | Prototype Backend | **REFACTOR** in modulare Server-Struktur |
| `server/.env.example` | brauchbar | **EXPAND** |
| `server/package.json` | unvollständig | **FIX** Dependencies + Scripts |
| `README.md` | veraltet/prototypisch | **REWRITE** auf echten Projektstatus |
| `.gitignore` | unvollständig | **FIX NOW** |
| `.npm-cache/` | Repo-Bloat | **REMOVE FROM VERSION CONTROL** |
| `npm_cache/` | Repo-Bloat | **REMOVE FROM VERSION CONTROL** |

**Regel:** Beim späteren Umbau wird diese Tabelle aktualisiert. Kein bestehender größerer Bereich soll „versehentlich verschwinden“.

---

# 5. MVP-Grenze

## 5.1 MVP muss enthalten

### Account
- Registrierung/Login,
- E-Mail-Verifizierung,
- Workspace,
- Rollen mindestens Owner/Admin/Member/Viewer,
- sichere Sessions.

### Targets
- Website,
- GitHub Repository,
- optional PDF/Text-Asset.

### Scanner
- Web Security Basischecks,
- Privacy/Cookie/Network Evidence,
- Accessibility mit echter Engine,
- EU-AI-Act Evidence/Guided Review,
- Repository Dependencies/Secrets/SAST-Basis,
- Evidence-Speicherung,
- Rule Engine,
- nachvollziehbares Scoring.

### Produkt
- Dashboard,
- Scan-Historie,
- Findings,
- Evidence-Ansicht,
- Remediation,
- Re-Scan,
- Report,
- Billing,
- Limits/Entitlements,
- Monitoring für bezahlte Pläne.

### Betrieb
- Tests,
- CI/CD,
- Staging,
- Production,
- Logging,
- Alerts,
- Backups,
- Restore-Test,
- Incident-Prozess.

## 5.2 Nicht MVP

- TrueSight als ernsthafte Deepfake-Erkennung,
- vollwertiges GRC/Audit Hub,
- komplexer Policy-as-Code-Marktplatz,
- automatische anwaltliche Dokumentgenerierung,
- große Enterprise-Suite,
- SAML/SCIM,
- On-Prem Appliance,
- White Label.

Diese Funktionen dürfen als Roadmap/Labs existieren, aber nicht vom Kern-MVP ablenken.

---

# 6. Zielarchitektur

```text
Browser / React App
        │
        ▼
API Gateway / Node Backend
        │
        ├── Auth
        ├── Workspace Authorization
        ├── Billing / Entitlements
        ├── Targets API
        ├── Scan API
        ├── Findings API
        ├── Reports API
        ├── Integrations API
        └── Admin / Operations API
        │
        ▼
PostgreSQL
        │
        ├── users
        ├── organizations
        ├── memberships
        ├── targets
        ├── scans
        ├── scan_jobs
        ├── evidence
        ├── findings
        ├── finding_instances
        ├── rules
        ├── rule_versions
        ├── legal_sources
        ├── subscriptions
        ├── integrations
        └── audit_events
        │
        ▼
Queue
        │
        ├── crawler worker
        ├── browser/privacy worker
        ├── security worker
        ├── accessibility worker
        ├── repository worker
        ├── asset worker
        ├── AI explanation worker
        └── report worker
        │
        ▼
Object Storage
        ├── screenshots
        ├── uploads
        ├── reports
        └── evidence artifacts
```

## Architekturregel

Lange Scans laufen **nicht** im HTTP-Request.

```text
POST scan
→ validieren
→ Scan + Job speichern
→ Queue
→ Worker
→ Evidence
→ Rules
→ Findings
→ AI Explanation optional
→ Scan complete
→ Frontend erhält Status
```

---

# 7. Lokale Entwicklungsumgebung — Zero to Running

Bevor Phase 1 abgeschlossen wird, muss ein neuer Entwickler GuardAI ohne versteckte lokale Abhängigkeiten starten können.

Benötigt:

- dokumentierte Node-Version,
- dokumentierter Package Manager,
- `.nvmrc` oder gleichwertige Versionsdatei,
- `npm install`/Workspace-Install,
- `.env.example`,
- Frontend-Start,
- Backend-Start,
- lokale Datenbank,
- lokale Queue,
- lokaler Storage-Ersatz oder Dev-Bucket,
- Seed-Daten,
- Test-Account,
- ein dokumentierter Reset-Befehl.

Zielzustand:

```bash
cp .env.example .env
npm install
npm run dev
```

oder ein genauso einfacher, dokumentierter Monorepo-Befehl.

Kein Entwickler darf globale, nicht dokumentierte Pakete benötigen.

---

# 8. Canonical API Contracts

Frontend und Backend dürfen nicht mehr unabhängig eigene Scan-Typen erfinden.

## 8.1 Gemeinsame Kategorien

Für MVP beispielsweise:

```ts
type ComplianceCategory =
  | 'security'
  | 'privacy'
  | 'accessibility'
  | 'ai-act'
  | 'repository';
```

Erweiterungen erfolgen nur bewusst und versioniert.

## 8.2 Finding-Status

```ts
type FindingStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'accepted_risk'
  | 'false_positive';
```

## 8.3 Detector Result

```ts
type DetectorState =
  | 'passed'
  | 'failed'
  | 'warning'
  | 'not_assessed'
  | 'error';
```

## 8.4 API-Versionierung

Vor öffentlicher API-Nutzung:

```text
/api/v1/...
```

Definieren:

- Request/Response-Schemas,
- Error-Schema,
- Pagination,
- Filter,
- Sortierung,
- Idempotency,
- Rate-Limit-Verhalten,
- Webhook-Schemas,
- Deprecation-Strategie.

Später: OpenAPI-Spezifikation als überprüfbare API-Quelle.

---

# 9. Datenmodell

Mindestens:

## User
- id
- email
- name
- status
- created_at
- last_login_at

## Organization
- id
- name
- slug
- plan
- created_at

## Membership
- organization_id
- user_id
- role

## Target
- id
- organization_id
- type (`website`, `repository`, `asset`)
- display_name
- canonical_url
- provider
- verification_state
- created_at

## Scan
- id
- organization_id
- target_id
- requested_by
- status
- scanner_version
- started_at
- completed_at
- failed_at
- overall_score nullable
- coverage

## Evidence
- id
- scan_id
- detector_id
- type
- source
- normalized_data
- artifact_url nullable
- content_hash
- captured_at

## Finding
- id
- rule_id
- organization_id
- target_id
- first_seen_at
- last_seen_at
- status

## FindingInstance
- finding_id
- scan_id
- severity
- confidence
- evidence_ids
- message
- remediation

## Rule
- id
- category
- title
- current_version

## RuleVersion
- rule_id
- version
- implementation_version
- legal_source_ids
- changed_at

## LegalSource
- id
- jurisdiction
- source_name
- reference
- effective_from
- effective_to nullable
- reviewed_at
- reviewer

## Subscription
- organization_id
- provider_customer_id
- provider_subscription_id
- plan
- status
- period_end

## AuditEvent
- organization_id
- actor_id
- action
- target_type
- target_id
- metadata
- created_at

---

# 10. Datenbank-Sicherheitsregeln

- Jede Query mit Kundendaten ist workspace-/tenant-aware.
- IDs aus dem Client sind niemals ausreichende Autorisierung.
- Kritische Aktionen schreiben Audit Events.
- Migrationen liegen in Git.
- Migrationen laufen zuerst in Staging.
- Riskante Migrationen haben Backout-Plan.
- Tenant-Isolation bekommt eigene automatisierte Tests.
- Sensible Felder werden nur gespeichert, wenn notwendig.

Später prüfen:

- Row Level Security,
- Feldverschlüsselung,
- Key Management,
- Key Rotation,
- regionale Datenhaltung.

---

# 11. Scanner-Grundmodell

Jeder Scanner muss deklarieren:

- `scanner_id`,
- `scanner_version`,
- Inputs,
- unterstützte Targets,
- Preconditions,
- ausgeführte Checks,
- nicht ausgeführte Checks,
- Evidence-Typen,
- Timeout,
- Fehlergründe,
- Coverage,
- Kostenmetriken.

## Scanner darf niemals

- bei Fehler automatisch „passed“ melden,
- nicht ausgeführte Checks als 100 % darstellen,
- CVEs erfinden,
- rechtliche Tatsachen aus fehlender Evidenz ableiten,
- versteckte Fallback-Mocks in Production nutzen.

---

# 12. Scanner-Coverage-Matrix für MVP

| Scanner | MVP | Wahrheitstyp | Ergebnis |
|---|---:|---|---|
| HTTP Security Headers | Ja | deterministisch | Header Evidence + Finding |
| TLS Basisinformationen | Ja | deterministisch | Evidence |
| Cookie Detection | Ja | beobachtet | Cookie Evidence |
| Network Tracker Detection | Ja | beobachtet | Request Evidence |
| Consent Interaction | Ja, begrenzt | Browser-Beobachtung | State + Confidence |
| Accessibility | Ja | automatisierte Engine | Violations + Nodes |
| AI Usage Indicators | Ja | Evidence + Guided Review | keine pauschale Rechtsgarantie |
| Dependency Vulnerabilities | Ja | Datenbankgestützt | Package + Version + Advisory |
| Secret Detection | Ja | statisch | Location + Rule |
| SAST Basis | Ja | statisch | Rule + Location |
| SBOM | Ja/kurz nach MVP | deterministisch | Komponentenliste |
| PDF/Text Policy Analysis | begrenzt | Parser + AI/Klassifikation | Evidence + Review |
| Deepfake Detection | Nein | — | Labs später |
| Vollständiges DAST/Pentest | Nein | — | nicht behaupten |

Diese Matrix wird pro Release erweitert.

---

# 13. Safe Crawler und Scan-Abuse-Schutz

Weil GuardAI fremde URLs verarbeitet, ist dies ein Kern-Sicherheitsbereich.

## 13.1 SSRF-Abwehr

Blockieren:

- localhost,
- Loopback,
- private IPv4/IPv6-Ranges,
- Link Local,
- Cloud Metadata Services,
- interne DNS-Namen,
- DNS-Rebinding-Szenarien,
- Redirects auf blockierte Ziele,
- nicht erlaubte Protokolle.

Prüfung erfolgt **vor jedem Netzwerk-Hop**, nicht nur bei der ursprünglichen URL.

## 13.2 Scan-Berechtigung

Für passive, öffentliche Checks können niedrigere Hürden gelten.

Für intensivere/aktive Checks brauchen wir eine Ownership-/Authorization-Strategie, z. B.:

- DNS TXT,
- HTML Meta Token,
- Datei im Webroot,
- verknüpftes GitHub Repository,
- oder explizite Workspace-Verifikation.

## 13.3 Abuse Controls

- Crawl-Budget,
- Seitenlimit,
- Zeitlimit,
- Request-Rate,
- globale und kundenbezogene Concurrency Limits,
- User-Agent,
- Opt-out/Blocklist,
- Missbrauchsmeldung,
- keine aggressiven Exploit-Tests im normalen SaaS-Scan.

---

# 14. Website Security Scanner

MVP-Basis:

- CSP,
- HSTS,
- X-Content-Type-Options,
- X-Frame-Options bzw. CSP frame-ancestors,
- Referrer-Policy,
- Permissions-Policy,
- Cookie Flags,
- HTTPS/TLS Basis,
- Mixed Content,
- öffentlich erkennbare gefährliche Konfigurationen.

Wichtig:

`Header nicht gefunden` ist ein technischer Fakt.

`Website ist unsicher` ist daraus nicht automatisch ableitbar.

---

# 15. Privacy Scanner

Nicht nur HTML-Text analysieren.

Browser Worker soll erfassen:

- Cookies vor Consent,
- Cookies nach Consent,
- Local/Session Storage,
- Requests zu Drittanbietern,
- Tracker-/Analytics-Indikatoren,
- Consent Manager,
- Skript-Ladeverhalten,
- relevante Screenshots/DOM-Auszüge.

Consent-Interaktion braucht:

- Accept-Flow,
- Reject-Flow,
- optional Settings-Flow,
- Unknown State, wenn UI nicht zuverlässig automatisiert werden kann.

**Unknown ist besser als erfundene Sicherheit.**

---

# 16. Accessibility Scanner

Echte Engine verwenden, z. B. axe-core oder gleichwertig.

Speichern:

- Rule ID,
- Impact,
- Help URL/Referenz,
- betroffene Nodes,
- DOM Selector,
- Beschreibung,
- Screenshot optional,
- Wiederholungen gruppiert.

Report muss klar sagen, dass automatisierte Accessibility-Tests nur einen Teil manueller Prüfung abdecken.

GuardAI selbst muss ebenfalls Keyboard-, Screenreader- und Kontrasttests bestehen.

---

# 17. EU-AI-Act / AI-Governance Scanner

Dieser Scanner darf nicht einfach aus einer Webseite „vollständige Konformität“ ableiten.

Er soll kombinieren:

1. technische Evidence,
2. erkannte AI-Funktionen/Provider-Hinweise,
3. Dokument-/Policy-Hinweise,
4. Fragen an den Kunden,
5. Requirement Mapping,
6. Review-State.

Beispiele für States:

```text
Evidence found
Evidence missing
Customer attested
Requires review
Not applicable
Not assessed
```

Jede rechtliche Zuordnung verweist auf versionierte `LegalSource`-Einträge.

---

# 18. Repository Scanner

Der heutige Top-Level-`package.json`-Check wird durch eine Pipeline ersetzt.

## MVP Module

- Dependency Discovery,
- Dependency Vulnerability Scan,
- Secret Scan,
- SAST Basis,
- Config/IaC Basis,
- Lockfile-Erkennung,
- GitHub Actions Review,
- SBOM-Erzeugung.

Mögliche Engines werden später technisch bewertet; Integration erfolgt hinter eigenen Adapter-Interfaces.

Jedes Finding muss mindestens enthalten:

- Datei,
- Position wenn verfügbar,
- Rule/Advisory,
- Package + Version wenn relevant,
- Severity,
- Evidence,
- Fix Guidance.

---

# 19. Datei-/Dokument-Scanner

## Upload Security

Serverseitig erzwingen:

- maximale Dateigröße,
- erlaubte MIME Types,
- Extension/MIME-Abgleich,
- zufällige Storage-Namen,
- Quarantäne vor Verarbeitung,
- Malware-Scan,
- Parser-Timeout,
- Memory-/CPU-Limit,
- Schutz vor ZIP-Bombs/Archive Expansion,
- keine direkte Ausführung hochgeladener Inhalte,
- Signed URLs,
- Retention/Löschung.

Unsupported File = klarer Fehler, **kein erfundener Inhalt**.

---

# 20. Rule Engine

Regeln gehören nicht in zufällige React-Komponenten.

Jede Rule besitzt:

- stabile ID,
- Kategorie,
- Version,
- Inputs/Evidence-Anforderungen,
- Detector Logic,
- Severity Logic,
- Confidence Logic,
- Message Template,
- Remediation,
- Requirement/Legal Mapping,
- Tests,
- Changelog.

Gleiche Evidence + gleiche Rule-Version muss denselben deterministischen Kernbefund erzeugen.

---

# 21. Scoring

Scoring darf keine Marketing-Zahl sein.

## Regeln

- Score `0` bleibt `0`.
- Nicht ausgeführte Kategorie = `Not assessed`, nicht 100 %.
- Coverage ist separat vom Score sichtbar.
- Severity und Confidence werden nicht vermischt.
- Weighting ist dokumentiert.
- Score-Version wird gespeichert.
- Änderungen am Modell verändern nicht heimlich historische Ergebnisse.

Beispiel:

```text
Overall score: 72
Coverage: 68 %
High-confidence critical findings: 1
Checks not assessed: 14
```

---

# 22. Evidence Integrity

Damit Reports später nachvollziehbar bleiben:

Jede Evidence speichert:

- Capture Time,
- Scanner-Version,
- Detector-Version,
- Content Hash,
- Source,
- optional Artifact Hash.

Ein Report speichert:

- Scan ID,
- Rule Versions,
- Score Version,
- Report Version,
- Generation Time.

Später möglich:

- signierte Report-Manifestdateien,
- öffentliche Verifikation eines Report-Hashes.

Nicht mit „offizieller Zertifizierung“ verwechseln.

---

# 23. AI Layer

AI darf GuardAI verbessern, aber nicht die Wahrheit ersetzen.

## AI darf

- Findings erklären,
- Texte klassifizieren,
- Remediation verständlicher machen,
- Zusammenfassungen erzeugen,
- ähnliche Findings clustern.

## AI darf nicht ohne deterministische Grundlage

- CVEs erfinden,
- technische Scans vortäuschen,
- Rechtskonformität garantieren,
- fehlende Evidence als vorhanden darstellen.

## AI Security

Gescannten Webseiten-/Dokumentinhalt immer als **untrusted data** behandeln.

Schutz gegen:

- Prompt Injection,
- Instructions in scanned pages,
- Data Exfiltration über Tool Calls,
- überlange Inputs,
- versteckte HTML-Instructions,
- Modell-Output außerhalb Schema.

AI Output:

- Zod/JSON-Schema validieren,
- Max Length,
- Timeouts,
- Retry-Limits,
- Kostenlimit,
- Fehler sichtbar machen.

## AI Evals

Vor Production:

- Golden Dataset,
- Hallucination Tests,
- Prompt-Injection Tests,
- Regression Suite,
- Provider-/Modellvergleich,
- Kosten pro Task,
- Qualitätsmetriken.

---

# 24. Authentication und Authorization

MVP:

- Registrierung,
- E-Mail-Verifikation,
- Login/Logout,
- sichere Sessions,
- Password Reset falls Password Auth,
- Rate Limits,
- Workspace Membership,
- Rollen Owner/Admin/Member/Viewer,
- Server-seitige Authorization.

Später Business/Enterprise:

- MFA Enforcement,
- OIDC/SSO,
- SAML,
- SCIM,
- Service Accounts,
- API Keys mit Scopes,
- Session Revocation,
- Enterprise Audit Log.

---

# 25. Billing und Entitlements

`CheckoutSimulation` wird vollständig ersetzt.

## Backend ist Source of Truth

Frontend darf Premium nie durch lokalen State freischalten.

Entitlements z. B.:

```ts
{
  maxTargets: 5,
  scansPerMonth: 100,
  monitoring: true,
  monitoringFrequency: 'daily',
  repositoryScanning: true,
  reportExport: true,
  seats: 3,
  historyDays: 365
}
```

## Billing Cases

Behandeln:

- Checkout,
- Webhook Verification,
- Trial,
- Upgrade,
- Downgrade,
- Proration,
- Cancellation,
- Renewal,
- Failed Payment,
- Dunning,
- Refund,
- Chargeback,
- Coupon optional,
- Invoice,
- VAT/USt. Darstellung,
- B2B/B2C-Unterschiede je Markt,
- Webhook Retry/Idempotency,
- regelmäßige Reconciliation mit Payment Provider.

---

# 26. Trust Center und Badge

Erst öffentlich aktivieren, wenn echte Evidence existiert.

Der Kunde kontrolliert:

- welche Targets öffentlich sind,
- welche Kategorien gezeigt werden,
- ob Score gezeigt wird,
- wann der Status deaktiviert wird.

Nicht anzeigen:

- erfundene Zertifikate,
- erfundene `Verified`-Status,
- pauschale Rechtskonformität.

Badge muss auf einen echten, aktuellen, serverseitig verifizierbaren Status verweisen.

---

# 27. Legal Source Registry

GuardAI braucht eine eigene versionierte Rechts-/Anforderungsquelle.

Jeder Eintrag:

- Jurisdiktion,
- Norm/Framework,
- Artikel/Abschnitt,
- Titel,
- offizielle Quelle,
- gültig ab,
- ggf. gültig bis,
- letzte fachliche Prüfung,
- Reviewer,
- verknüpfte Rules.

**Rule-Versionen dürfen nicht stillschweigend auf neue Rechtsstände wechseln.**

Wenn sich eine Rechtsgrundlage ändert:

1. Source aktualisieren,
2. betroffene Rules identifizieren,
3. fachlich prüfen,
4. Rule-Version erhöhen,
5. Tests anpassen,
6. Release Notes,
7. neue Scans verwenden neue Version.

---

# 28. Datenschutz und Data Governance von GuardAI

Vor Production erstellen wir eine reale Data Map.

Für jeden Datentyp dokumentieren:

- was,
- Zweck,
- Rechts-/Vertragsgrundlage nach fachlicher Prüfung,
- Speicherort,
- Region,
- Subprocessor,
- Retention,
- Löschweg,
- Zugriffsrollen,
- Backup-Verhalten.

Wichtige Daten:

- Accountdaten,
- Domains,
- Repository Metadata,
- Scan Evidence,
- Screenshots,
- hochgeladene Dokumente,
- AI Inputs/Outputs,
- Billing IDs,
- Audit Logs,
- Supportdaten.

Prozesse:

- Auskunft/DSAR,
- Export/Portabilität,
- Korrektur,
- Löschung,
- Account-/Workspace-Deletion,
- Backup Expiry,
- Data Breach Process,
- DPIA/DSFA-Prüfung,
- Subprocessor Register,
- internationale Transfers/SCC/TIA falls relevant.

---

# 29. Security von GuardAI selbst

## Web/API

- CSP,
- HSTS,
- Secure Cookies,
- CSRF-Schutz passend zur Auth-Architektur,
- CORS-Allowlist,
- Request Size Limits,
- Rate Limits,
- Input Validation,
- Output Encoding,
- sichere Error Messages.

## Secrets

- niemals in Git,
- getrennt pro Environment,
- Secret Manager in Production,
- Rotation-Prozess,
- sofortige Rotation bei Leak.

## Supply Chain

- Lockfiles,
- Dependency Scan,
- Secret Scan,
- SAST,
- automatisierte Update-PRs,
- Release Review.

## Threat Model

Vor Beta mindestens für:

- URL Scanner / SSRF,
- Uploads,
- Auth,
- Tenant Isolation,
- Billing Webhooks,
- GitHub OAuth,
- AI Prompt Injection,
- Public Trust Center.

---

# 30. Testing

## Unit

- Rules,
- Scoring,
- URL Validation,
- SSRF Guards,
- Entitlements,
- Mappers,
- Parsers.

## Integration

- API + DB,
- Auth + Authorization,
- Queue + Worker,
- Billing Webhooks,
- Storage,
- Scanner Adapters.

## E2E

- Register → first scan,
- login/logout,
- scan success,
- scan failure,
- billing upgrade,
- cancellation,
- target deletion,
- workspace isolation,
- Trust Center publication.

## Security Regression

- SSRF corpus,
- malicious uploads,
- auth bypass,
- tenant leakage,
- webhook replay,
- prompt injection.

## Performance

- API load,
- queue stress,
- worker concurrency,
- DB load,
- browser memory/CPU,
- largest supported site/document/repository.

---

# 31. CI/CD und Release Engineering

Pull Requests müssen mindestens prüfen:

- install,
- typecheck,
- lint,
- unit tests,
- integration subset,
- build,
- secret scan,
- dependency scan.

Production Pipeline:

```text
merge
→ CI green
→ build immutable artifact
→ staging deploy
→ smoke tests
→ migrations
→ production deploy
→ smoke tests
→ monitoring
```

Zusätzlich:

- Feature Flags für riskante Features,
- Rollback,
- Canary/gradual rollout später,
- Release-Version,
- Changelog,
- Commit SHA im Deployment,
- Dependency Automation,
- Migration compatibility review.

---

# 32. Environments

Mindestens:

```text
local
staging
production
```

Getrennt pro Environment:

- Database,
- Auth Config,
- API Keys,
- Payment Mode,
- Storage,
- Webhooks,
- OAuth Apps,
- AI Keys.

Frontend-Environment-Variablen gelten grundsätzlich als öffentlich.

---

# 33. Deployment Architecture

Minimum:

```text
CDN / Web Hosting
      ↓
Frontend
      ↓
API
      ↓
Postgres
      ↓
Queue
      ↓
Workers
      ↓
Object Storage
```

Für Browser-Scanner ggf. getrennte isolierte Worker-Klasse.

Benötigt:

- Health endpoint,
- Readiness endpoint,
- Worker health,
- migration status,
- log access,
- autoscaling/concurrency policy,
- backups,
- rollback.

---

# 34. Observability, SLO und Incident Management

Wir müssen Fehler erkennen, bevor Kunden sie melden.

Metriken:

- API error rate,
- API latency,
- scan success rate,
- scan duration,
- queue lag,
- worker failures,
- browser crash rate,
- AI error rate,
- AI cost,
- DB saturation,
- billing webhook failures.

Logs:

- strukturiert,
- request_id,
- scan_id,
- organization_id nur wenn sicher,
- keine Secrets,
- keine vollständigen sensiblen Dokumentinhalte.

Vor Paid Beta definieren:

- internes Uptime-SLO,
- Scan Success SLO,
- P0/P1/P2-Severity,
- On-call/Eskalationsweg,
- Incident Runbook,
- Status Page Strategie.

---

# 35. Backup, Disaster Recovery und Business Continuity

Nicht nur Backup aktivieren — Restore testen.

Definieren:

- Backup Frequenz,
- Backup Retention,
- Verschlüsselung,
- Region,
- RPO,
- RTO,
- Restore Procedure,
- Reihenfolge für DB → Queue → API → Worker → Frontend,
- Umgang mit teilweise ausgeführten Scan-Jobs,
- regelmäßige Recovery-Übung.

---

# 36. Frontend-Qualität

GuardAI selbst muss qualitativ besser sein als das, was es bewertet.

Prüfen:

- Desktop,
- Tablet,
- Mobile,
- Chromium,
- Firefox,
- Safari/WebKit,
- Keyboard Navigation,
- Screenreader,
- Focus States,
- Kontrast,
- Form Errors,
- Loading States,
- Empty States,
- Offline/API Error,
- 404,
- 500,
- Performance Budget.

Marketing-Seiten:

- SEO Metadata,
- Open Graph,
- Sitemap,
- Robots Rules,
- Canonical URLs,
- Structured Data wenn sinnvoll.

Später:

- i18n Deutsch/Englisch,
- Locale-Datum/Zeit,
- Währung,
- Rechtsraum-spezifische Rule Sets.

---

# 37. E-Mail, Support und Kommunikation

Transactional Mail:

- Verify Email,
- Password Reset,
- Scan completed,
- Scan failed,
- New critical finding,
- Monitoring alert,
- Invite,
- Invoice/Payment falls Provider nicht alles übernimmt,
- Failed payment.

Domain Hygiene:

- SPF,
- DKIM,
- DMARC,
- Bounce Handling,
- Complaint Handling.

Support:

- Support-Adresse,
- Help Center,
- Bug Report,
- Feature Request,
- Account Recovery,
- Abuse Report,
- Security Contact,
- später SLA nach Plan.

---

# 38. Product Analytics

Nur datenschutzgerecht und transparent einsetzen.

Kern-Funnel messen:

```text
visit
→ signup
→ email verified
→ target created
→ first scan started
→ first scan completed
→ finding opened
→ second scan
→ upgrade
→ retained workspace
```

Zusätzlich:

- activation rate,
- scan completion rate,
- repeat scans,
- false positive feedback,
- time to remediation,
- conversion,
- churn.

Keine Produktentscheidung nur anhand „schöner Dashboard-Zahlen“.

---

# 39. FinOps / Kostenkontrolle

GuardAI kann durch Browser-Worker, AI und Scans teuer werden.

Messen pro Scan:

- API Requests,
- Browser Minuten,
- CPU/RAM,
- Queue Time,
- AI Tokens/Kosten,
- Storage Bytes,
- Report Generation,
- Egress.

Plan-Limits müssen Backend-seitig Kosten begrenzen.

Alarmieren bei:

- ungewöhnlichem Scan-Volumen,
- AI-Kosten-Spikes,
- Endlosschleifen,
- Worker-Storm,
- Missbrauch einzelner Accounts.

---

# 40. ADRs — Architecture Decision Records

Größere Entscheidungen werden unter `docs/adr/` dokumentiert.

Beispiele:

- `0001-evidence-first-product-positioning.md`
- `0002-database-and-auth-provider.md`
- `0003-job-queue.md`
- `0004-browser-worker.md`
- `0005-ai-provider-abstraction.md`
- `0006-billing-provider.md`

Jede ADR enthält:

- Problem,
- Optionen,
- Entscheidung,
- Gründe,
- Nachteile,
- Konsequenzen,
- Datum/Status.

---

# 41. Risk Register

Ein lebendes Register muss mindestens diese Risiken führen:

| Risiko | Priorität | Gegenmaßnahme |
|---|---|---|
| SSRF über URL Scanner | P0 | Safe Fetcher + Tests |
| Tenant Data Leak | P0 | Authorization + Isolation Tests |
| falsche Compliance-Aussage | P0 | Evidence-first + Claim Review |
| AI Hallucination | P1 | Schemas + Evals + deterministic truth |
| Prompt Injection | P1 | untrusted-content boundary |
| Upload Malware | P1 | Quarantine + malware scan |
| Payment Manipulation | P1 | server entitlements + signed webhooks |
| Scan Abuse / DoS | P1 | ownership + quotas + budgets |
| Datenverlust | P1 | backups + restore + DR |
| Provider-Ausfall | P1 | retries + graceful degradation |
| Regelwerk veraltet | P1 | Legal Source Registry + review cadence |
| hohe Scan-Kosten | P1 | FinOps + quotas |

Owner und Status werden ergänzt, sobald Teamrollen feststehen.

---

# 42. Exakte Build-Reihenfolge

Diese Reihenfolge ist verbindlich, kann aber mit dokumentierter Begründung angepasst werden.

## Phase 0 — Scope Freeze & Repository Hygiene

- Master Guide aktualisieren.
- Repo Inventory aktualisieren.
- README ehrlich auf Ist-Zustand bringen.
- `.gitignore` härten.
- Cache-Verzeichnisse aus Version Control entfernen.
- Secrets prüfen.
- ungenutzte/duplizierte Dateien identifizieren.
- aktuelle P0/P1-Liste einfrieren.

**Exit:** Repo ist sauber dokumentiert und wir wissen bei jeder großen existierenden Komponente, was damit passiert.

## Phase 1 — Development Standards

- Node/Package-Manager-Version festlegen.
- `.nvmrc`/Version File.
- Scripts vereinheitlichen.
- Formatting/Lint/Typecheck.
- EditorConfig.
- Commit/PR Standards.
- `CONTRIBUTING.md`.

## Phase 2 — Frontend Core Repair

- echte Router-Struktur,
- doppelte Views entfernen,
- Error Boundary,
- Layouts,
- Auth/Public Route Trennung vorbereiten.

## Phase 3 — Shared Contracts + API Client

- canonical schemas,
- keine `any`-Mappings,
- API base URL config,
- errors,
- scan request/options wirklich übertragen.

## Phase 4 — Backend Foundation

- `server/index.js` modularisieren,
- Dependencies korrigieren,
- config validation,
- error middleware,
- health/readiness,
- Tests.

## Phase 5 — Auth / Workspaces / RBAC

- echte Accounts,
- Memberships,
- serverseitige Autorisierung.

## Phase 6 — Database / Persistence

- Postgres,
- migrations,
- scan history,
- findings/evidence,
- audit events.

## Phase 7 — Queue / Worker Runtime

- async jobs,
- retries,
- timeout,
- idempotency,
- cancellation/failure states.

## Phase 8 — Safe Fetcher / Crawler

- SSRF,
- redirect validation,
- DNS/IP validation,
- budgets,
- ownership model für aktive Scans.

## Phase 9 — Web Security Scanner

- echte deterministische Checks.

## Phase 10 — Privacy Browser Scanner

- cookies/network/storage/consent evidence.

## Phase 11 — Accessibility Scanner

- echte Engine + evidence.

## Phase 12 — AI Act / Governance Evidence

- evidence + guided review + legal source mapping.

## Phase 13 — Repository Scanner

- dependencies,
- advisories,
- secrets,
- SAST,
- SBOM/config checks.

## Phase 14 — Asset Scanner

- safe upload pipeline + echte Parser.

## Phase 15 — Rule Engine

- versionierte Rules.

## Phase 16 — Scoring / Coverage

- transparentes Modell.

## Phase 17 — AI Explanation Layer

- schema validated,
- Evals,
- prompt-injection safeguards.

## Phase 18 — Real Dashboard

- alle Mock-Zahlen entfernen.

## Phase 19 — Reports

- report from evidence.

## Phase 20 — Trust Center / Badge

- only real state.

## Phase 21 — Billing / Entitlements

- real payment provider.

## Phase 22 — Lead Generation

- real backend + privacy-safe consent.

## Phase 23 — Monitoring / Notifications

- schedules + deduplicated alerts.

## Phase 24 — Integrations

- GitHub zuerst,
- danach Slack/Jira/etc. nach Bedarf.

## Phase 25 — AI Counsel

- real workspace context.

## Phase 26 — Audit Hub / Policy Manager

- erst nach stabilem Core.

## Phase 27 — TrueSight Labs

- nur mit echten Modellen/Evals.

## Phase 28 — Security Hardening

- threat model,
- auth review,
- tenant isolation,
- upload review,
- SSRF regression,
- AI security.

## Phase 29 — Full Test Matrix

- unit/integration/e2e/security/performance.

## Phase 30 — CI/CD

- protected quality gates.

## Phase 31 — Observability

- logs/metrics/traces/alerts.

## Phase 32 — Environments

- local/staging/prod.

## Phase 33 — Deployment

- reproducible infrastructure.

## Phase 34 — Domain / DNS / Mail

- production identities.

## Phase 35 — Privacy / Data Governance

- real data map + deletion/export.

## Phase 36 — Legal Pages / Claims Review

- Impressum/Privacy/Terms/Claims nach tatsächlichem System.

## Phase 37 — Pricing / Packaging

- limits auf reale Kosten/Value abbilden.

## Phase 38 — Pre-Launch Security Review

- P0/P1 schließen,
- unabhängiger Review sobald sinnvoll.

## Phase 39 — Staging Release

- vollständige Testmatrix.

## Phase 40 — Production Launch

- kontrollierter Rollout.

## Phase 41 — Launch Sequence

```text
Internal Alpha
→ Private Beta
→ Paid Beta
→ Public Launch
```

## Phase 42 — Post-Launch Operating Loop

Wöchentlich:

- scan failures,
- false positives,
- security alerts,
- queue health,
- customer feedback,
- AI costs,
- billing failures,
- rules needing updates.

Monatlich:

- rule/legal review,
- dependency review,
- restore spot-check,
- FinOps review,
- roadmap reprioritization.

---

# 43. Zero-to-Production Master Checklist

Diese Liste ist der lineare Ablauf. Details stehen in den Phasen oben.

## Foundation

- [ ] 001 Master Guide aktuell
- [ ] 002 Repo Inventory aktuell
- [ ] 003 README korrekt
- [ ] 004 `.gitignore` sicher
- [ ] 005 Cache-Artefakte aus Git entfernt
- [ ] 006 Secret Review abgeschlossen
- [ ] 007 Node-Version festgelegt
- [ ] 008 Package Manager festgelegt
- [ ] 009 clean install dokumentiert
- [ ] 010 lint/typecheck/build Scripts funktionieren
- [ ] 011 erste CI Pipeline vorhanden

## Core Application

- [ ] 012 App Routing bereinigt
- [ ] 013 duplicate renders entfernt
- [ ] 014 Error Boundary
- [ ] 015 API base URL konfigurierbar
- [ ] 016 Shared Schemas
- [ ] 017 Frontend/Backend category model identisch
- [ ] 018 status model identisch
- [ ] 019 Mock fallback aus Production Path entfernt
- [ ] 020 Backend Dependencies vollständig
- [ ] 021 Backend modularisiert
- [ ] 022 Config startup validation
- [ ] 023 Health/Readiness

## Accounts / Data

- [ ] 024 Auth
- [ ] 025 E-Mail Verification
- [ ] 026 Workspace
- [ ] 027 RBAC
- [ ] 028 Postgres
- [ ] 029 Migrations
- [ ] 030 Targets
- [ ] 031 Scans
- [ ] 032 Evidence
- [ ] 033 Findings
- [ ] 034 Audit Events
- [ ] 035 Tenant Isolation Tests

## Scan Runtime

- [ ] 036 Queue
- [ ] 037 Worker
- [ ] 038 Retry/Timeout
- [ ] 039 Idempotency
- [ ] 040 Scan progress events
- [ ] 041 Safe URL parser
- [ ] 042 DNS/IP SSRF guard
- [ ] 043 redirect guard
- [ ] 044 crawler budgets
- [ ] 045 ownership/authorization model

## Scanner Engines

- [ ] 046 HTTP/security scanner
- [ ] 047 privacy browser worker
- [ ] 048 consent flows
- [ ] 049 accessibility engine
- [ ] 050 AI evidence scanner
- [ ] 051 GitHub auth/connection
- [ ] 052 dependency scanner
- [ ] 053 advisory mapping
- [ ] 054 secret scanner
- [ ] 055 SAST basis
- [ ] 056 SBOM
- [ ] 057 upload quarantine
- [ ] 058 malware scan
- [ ] 059 document parser limits

## Intelligence / Evidence

- [ ] 060 Rule Engine
- [ ] 061 Rule Versioning
- [ ] 062 Legal Source Registry
- [ ] 063 Evidence Hashing
- [ ] 064 Score Model
- [ ] 065 Coverage Model
- [ ] 066 AI Provider Adapter
- [ ] 067 AI Schema Validation
- [ ] 068 Prompt Injection Tests
- [ ] 069 AI Eval Dataset

## Product UI

- [ ] 070 Dashboard real data
- [ ] 071 Findings real data
- [ ] 072 Evidence view
- [ ] 073 remediation state
- [ ] 074 re-scan
- [ ] 075 history
- [ ] 076 real scan progress
- [ ] 077 reports
- [ ] 078 Trust Center
- [ ] 079 Badge

## Monetization / Operations

- [ ] 080 real checkout
- [ ] 081 signed webhooks
- [ ] 082 entitlements
- [ ] 083 failed payment handling
- [ ] 084 invoices/tax display reviewed
- [ ] 085 lead capture real
- [ ] 086 notifications
- [ ] 087 monitoring schedules
- [ ] 088 GitHub integration real

## Quality / Security

- [ ] 089 Unit Tests
- [ ] 090 Integration Tests
- [ ] 091 E2E Tests
- [ ] 092 SSRF regression suite
- [ ] 093 malicious upload suite
- [ ] 094 tenant isolation suite
- [ ] 095 billing webhook replay tests
- [ ] 096 performance tests
- [ ] 097 dependency scanning CI
- [ ] 098 secret scanning CI
- [ ] 099 security threat model review

## Production Platform

- [ ] 100 staging
- [ ] 101 production database
- [ ] 102 production storage
- [ ] 103 queue/workers production
- [ ] 104 secrets manager
- [ ] 105 logs
- [ ] 106 metrics
- [ ] 107 alerts
- [ ] 108 backups
- [ ] 109 restore test
- [ ] 110 RPO/RTO defined
- [ ] 111 rollback tested

## Customer-facing Launch

- [ ] 112 production domain
- [ ] 113 DNS/TLS
- [ ] 114 SPF/DKIM/DMARC
- [ ] 115 transactional email
- [ ] 116 privacy policy matches system
- [ ] 117 terms/AGB reviewed
- [ ] 118 Impressum reviewed
- [ ] 119 subprocessor list
- [ ] 120 deletion/export works
- [ ] 121 marketing claim review
- [ ] 122 cross-browser/mobile test
- [ ] 123 GuardAI accessibility test
- [ ] 124 SEO/metadata
- [ ] 125 support/security contact
- [ ] 126 status/incident process
- [ ] 127 staging sign-off
- [ ] 128 internal alpha
- [ ] 129 private beta
- [ ] 130 paid beta
- [ ] 131 public launch
- [ ] 132 post-launch weekly operating loop active

---

# 44. Definition of Done für jedes Scanner-Finding

Ein neues Finding ist nur fertig, wenn:

- [ ] reale Evidence existiert,
- [ ] Rule ID existiert,
- [ ] Rule Version existiert,
- [ ] Scanner Version gespeichert wird,
- [ ] Severity definiert ist,
- [ ] Confidence definiert ist,
- [ ] Remediation existiert,
- [ ] Coverage/Limitations klar sind,
- [ ] keine erfundene Rechts-/Security-Aussage enthalten ist,
- [ ] Unit Test existiert,
- [ ] negativer Test existiert,
- [ ] UI es korrekt darstellen kann,
- [ ] Report es korrekt darstellen kann.

---

# 45. Definition of Done für jedes Produktfeature

Ein Produktfeature ist nicht „fertig“, nur weil ein Button sichtbar ist.

Fertig bedeutet:

- [ ] UI,
- [ ] Backend,
- [ ] Datenmodell falls nötig,
- [ ] Authorization,
- [ ] Error States,
- [ ] Loading/Empty States,
- [ ] Audit/Logging falls relevant,
- [ ] Tests,
- [ ] Security Review,
- [ ] Dokumentation,
- [ ] Observability,
- [ ] reale Production-Funktion.

Mock-/Preview-Funktion muss ausdrücklich so gekennzeichnet sein.

---

# 46. GuardAI Product Claims Gate

Vor jedem öffentlichen Text fragen wir:

1. Können wir diese Aussage technisch beweisen?
2. Welche Evidence erzeugt sie?
3. Welche Limitation hat sie?
4. Ist sie rechtlich/fachlich review-pflichtig?
5. Könnte der Nutzer sie als Garantie verstehen?
6. Ist die Aussage nach einem Scanner-Ausfall weiterhin korrekt?

Wenn eine dieser Fragen nicht sauber beantwortet werden kann, wird die Formulierung abgeschwächt oder entfernt.

---

# 47. Regel für zukünftige Änderungen an dieser Anleitung

Diese Datei ist absichtlich nicht eingefroren.

Wir dürfen jederzeit:

- neue Risiken ergänzen,
- Phasen genauer machen,
- eine Technologie austauschen,
- Reihenfolgen anpassen,
- Features verschieben,
- neue Acceptance Criteria hinzufügen.

Aber jede größere Änderung muss diese drei Fragen beantworten:

1. **Warum ist die Änderung für GuardAI sinnvoll?**
2. **Welche bestehende Phase/Architektur wird dadurch beeinflusst?**
3. **Entsteht dadurch ein neues Security-, Legal-, Kosten- oder Betriebsrisiko?**

---

# 48. Aktueller nächster Schritt

Wir beginnen jetzt mit **Phase 0 — Scope Freeze & Repository Hygiene**.

Reihenfolge:

```text
1. Master Guide ✅
2. README korrigieren
3. .gitignore härten
4. Phase-0-Tracker anlegen
5. Repo-Bloat/Cache Removal vorbereiten
6. Secrets/Config prüfen
7. P0-Komponentenliste finalisieren
8. danach Phase 1
```

Die Anleitung wird nach jedem größeren GuardAI-Meilenstein aktualisiert.
