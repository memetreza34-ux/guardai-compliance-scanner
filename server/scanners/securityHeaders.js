function buildSecurityCategory(headers) {
  const contentSecurityPolicy = String(headers['content-security-policy'] || '');
  const checks = [
    {
      present: Boolean(contentSecurityPolicy),
      issue: {
        id: 'missing-csp',
        title: 'Content-Security-Policy fehlt',
        description: 'Für die analysierte HTTP-Antwort wurde kein Content-Security-Policy-Header beobachtet.',
        severity: 'critical',
        fixSuggestion: 'Definiere eine passende Content-Security-Policy und teste sie zunächst im Report-Only-Modus.',
      },
    },
    {
      present: Boolean(headers['strict-transport-security']),
      issue: {
        id: 'missing-hsts',
        title: 'Strict-Transport-Security fehlt',
        description: 'Für die analysierte HTTPS-Antwort wurde kein HSTS-Header beobachtet.',
        severity: 'warning',
        fixSuggestion: 'Aktiviere HSTS erst, wenn HTTPS für die betroffenen Hosts vollständig und dauerhaft funktioniert.',
      },
    },
    {
      present: Boolean(headers['x-frame-options']) || contentSecurityPolicy.includes('frame-ancestors'),
      issue: {
        id: 'missing-frame-protection',
        title: 'Kein eindeutiger Frame-Schutz erkannt',
        description: 'Weder X-Frame-Options noch eine offensichtliche frame-ancestors-Direktive wurde in der analysierten Antwort erkannt.',
        severity: 'warning',
        fixSuggestion: 'Nutze vorzugsweise CSP frame-ancestors und prüfe die tatsächlich benötigten Einbettungsquellen.',
      },
    },
  ];

  const issues = checks.filter((check) => !check.present).map((check) => check.issue);
  const passedChecks = checks.length - issues.length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    score,
    totalChecks: checks.length,
    passedChecks,
    status: issues.some((issue) => issue.severity === 'critical')
      ? 'critical'
      : issues.length > 0
        ? 'warning'
        : 'compliant',
    issues,
  };
}

module.exports = { buildSecurityCategory };
