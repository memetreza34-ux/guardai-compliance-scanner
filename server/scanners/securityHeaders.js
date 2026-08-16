const DETECTOR_ID = 'security.headers';
const DETECTOR_VERSION = '1.0.0';

function buildSecurityAssessment(headers, finalUrl) {
  const contentSecurityPolicy = String(headers['content-security-policy'] || '');
  const secureTransport = new URL(finalUrl).protocol === 'https:';
  const hstsPresent = Boolean(headers['strict-transport-security']);
  const xFrameOptionsPresent = Boolean(headers['x-frame-options']);
  const cspFrameAncestorsPresent = /(?:^|;)\s*frame-ancestors\b/i.test(contentSecurityPolicy);
  const frameProtectionPresent = xFrameOptionsPresent || cspFrameAncestorsPresent;

  const checks = [
    {
      id: 'https-transport',
      applicable: true,
      passed: secureTransport,
      issue: {
        id: 'insecure-http-transport',
        title: 'Ziel endet nicht auf HTTPS',
        description: 'Nach den erlaubten Redirects wurde die analysierte Ressource weiterhin über unverschlüsseltes HTTP erreicht.',
        severity: 'critical',
        fixSuggestion: 'Leite HTTP konsequent auf HTTPS um und stelle sicher, dass die Zielressource ausschließlich verschlüsselt ausgeliefert wird.',
      },
    },
    {
      id: 'content-security-policy',
      applicable: true,
      passed: Boolean(contentSecurityPolicy),
      issue: {
        id: 'missing-csp',
        title: 'Content-Security-Policy fehlt',
        description: 'Für die analysierte HTTP-Antwort wurde kein Content-Security-Policy-Header beobachtet.',
        severity: 'critical',
        fixSuggestion: 'Definiere eine passende Content-Security-Policy und teste sie zunächst im Report-Only-Modus.',
      },
    },
    {
      id: 'strict-transport-security',
      applicable: secureTransport,
      passed: hstsPresent,
      issue: {
        id: 'missing-hsts',
        title: 'Strict-Transport-Security fehlt',
        description: 'Für die analysierte HTTPS-Antwort wurde kein HSTS-Header beobachtet.',
        severity: 'warning',
        fixSuggestion: 'Aktiviere HSTS erst, wenn HTTPS für die betroffenen Hosts vollständig und dauerhaft funktioniert.',
      },
    },
    {
      id: 'frame-protection',
      applicable: true,
      passed: frameProtectionPresent,
      issue: {
        id: 'missing-frame-protection',
        title: 'Kein eindeutiger Frame-Schutz erkannt',
        description: 'Weder X-Frame-Options noch eine offensichtliche frame-ancestors-Direktive wurde in der analysierten Antwort erkannt.',
        severity: 'warning',
        fixSuggestion: 'Nutze vorzugsweise CSP frame-ancestors und prüfe die tatsächlich benötigten Einbettungsquellen.',
      },
    },
  ];

  const applicableChecks = checks.filter((check) => check.applicable);
  const issues = applicableChecks.filter((check) => !check.passed).map((check) => check.issue);
  const passedChecks = applicableChecks.length - issues.length;
  const score = Math.round((passedChecks / applicableChecks.length) * 100);

  const category = {
    score,
    totalChecks: applicableChecks.length,
    passedChecks,
    status: issues.some((issue) => issue.severity === 'critical')
      ? 'critical'
      : issues.length > 0
        ? 'warning'
        : 'compliant',
    issues,
  };

  return {
    detectorId: DETECTOR_ID,
    detectorVersion: DETECTOR_VERSION,
    category,
    evidence: {
      finalUrl,
      secureTransport,
      contentSecurityPolicyPresent: Boolean(contentSecurityPolicy),
      hsts: {
        applicable: secureTransport,
        present: hstsPresent,
      },
      frameProtection: {
        present: frameProtectionPresent,
        mechanism: cspFrameAncestorsPresent
          ? 'csp-frame-ancestors'
          : xFrameOptionsPresent
            ? 'x-frame-options'
            : null,
      },
      score,
      totalChecks: applicableChecks.length,
      passedChecks,
    },
  };
}

function buildSecurityCategory(headers, finalUrl = 'https://invalid.local/') {
  return buildSecurityAssessment(headers, finalUrl).category;
}

module.exports = {
  buildSecurityAssessment,
  buildSecurityCategory,
  DETECTOR_ID,
  DETECTOR_VERSION,
};