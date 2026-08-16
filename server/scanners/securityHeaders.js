const cheerio = require('cheerio');

const DETECTOR_ID = 'security.headers';
const DETECTOR_VERSION = '1.1.0';
const MAX_MIXED_CONTENT_SAMPLES = 20;

function headerValue(headers, name) {
  const value = headers?.[name];
  if (Array.isArray(value)) return value.join(', ');
  return value === undefined || value === null ? '' : String(value);
}

function normalizeSetCookieHeaders(headers) {
  const raw = headers?.['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw.map(String) : [String(raw)];
}

function analyzeCookieAttributes(headers, secureTransport) {
  const cookies = normalizeSetCookieHeaders(headers);
  let missingSecure = 0;
  let missingHttpOnly = 0;
  let missingSameSite = 0;

  for (const cookie of cookies) {
    const attributes = cookie.split(';').slice(1).map((part) => part.trim().toLowerCase());
    if (secureTransport && !attributes.some((part) => part === 'secure')) missingSecure += 1;
    if (!attributes.some((part) => part === 'httponly')) missingHttpOnly += 1;
    if (!attributes.some((part) => part.startsWith('samesite='))) missingSameSite += 1;
  }

  return {
    observed: cookies.length,
    missingSecure,
    missingHttpOnly,
    missingSameSite,
  };
}

function sanitizeMixedContentUrl(value, baseUrl) {
  try {
    const parsed = new URL(value, baseUrl);
    if (parsed.protocol !== 'http:') return null;
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

function analyzeMixedContent(html, finalUrl) {
  if (typeof html !== 'string' || new URL(finalUrl).protocol !== 'https:') {
    return { applicable: false, count: 0, activeCount: 0, samples: [] };
  }

  const $ = cheerio.load(html);
  const selectors = [
    ['script[src]', 'src', true],
    ['iframe[src]', 'src', true],
    ['form[action]', 'action', true],
    ['link[href]', 'href', true],
    ['img[src]', 'src', false],
    ['source[src]', 'src', false],
    ['video[src]', 'src', false],
    ['audio[src]', 'src', false],
  ];

  let count = 0;
  let activeCount = 0;
  const samples = [];

  for (const [selector, attribute, active] of selectors) {
    $(selector).each((_index, element) => {
      const value = $(element).attr(attribute);
      if (!value) return;
      const sanitized = sanitizeMixedContentUrl(value, finalUrl);
      if (!sanitized) return;
      count += 1;
      if (active) activeCount += 1;
      if (samples.length < MAX_MIXED_CONTENT_SAMPLES) {
        samples.push({
          element: element.tagName || selector.split('[')[0],
          attribute,
          url: sanitized,
          active: Boolean(active),
        });
      }
    });
  }

  return { applicable: true, count, activeCount, samples };
}

function buildSecurityAssessment(headers, finalUrl, html = null) {
  const contentSecurityPolicy = headerValue(headers, 'content-security-policy');
  const secureTransport = new URL(finalUrl).protocol === 'https:';
  const hstsPresent = Boolean(headerValue(headers, 'strict-transport-security'));
  const xFrameOptionsPresent = Boolean(headerValue(headers, 'x-frame-options'));
  const cspFrameAncestorsPresent = /(?:^|;)\s*frame-ancestors\b/i.test(contentSecurityPolicy);
  const frameProtectionPresent = xFrameOptionsPresent || cspFrameAncestorsPresent;
  const xContentTypeOptions = headerValue(headers, 'x-content-type-options').trim().toLowerCase();
  const referrerPolicyPresent = Boolean(headerValue(headers, 'referrer-policy'));
  const permissionsPolicyPresent = Boolean(headerValue(headers, 'permissions-policy'));
  const cookieAttributes = analyzeCookieAttributes(headers, secureTransport);
  const mixedContent = analyzeMixedContent(html, finalUrl);

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
    {
      id: 'nosniff',
      applicable: true,
      passed: xContentTypeOptions === 'nosniff',
      issue: {
        id: 'missing-nosniff',
        title: 'X-Content-Type-Options: nosniff nicht erkannt',
        description: 'Die beobachtete Antwort enthält keinen eindeutigen X-Content-Type-Options: nosniff Header.',
        severity: 'warning',
        fixSuggestion: 'Setze X-Content-Type-Options auf nosniff, sofern keine dokumentierte technische Ausnahme dagegen spricht.',
      },
    },
    {
      id: 'cookie-secure',
      applicable: secureTransport && cookieAttributes.observed > 0,
      passed: cookieAttributes.missingSecure === 0,
      issue: {
        id: 'cookies-without-secure',
        title: 'Set-Cookie ohne Secure beobachtet',
        description: `${cookieAttributes.missingSecure} in dieser Antwort gesetzte Cookie(s) wurden auf HTTPS ohne Secure-Attribut beobachtet.`,
        severity: 'warning',
        fixSuggestion: 'Prüfe die betroffenen Cookies und setze Secure für Cookies, die ausschließlich über HTTPS übertragen werden sollen.',
      },
    },
    {
      id: 'mixed-content',
      applicable: mixedContent.applicable,
      passed: mixedContent.count === 0,
      issue: {
        id: 'mixed-content-observed',
        title: 'HTTP-Ressourcen in HTTPS-Dokument beobachtet',
        description: `${mixedContent.count} absolute HTTP-Ressource(n) wurden in der analysierten HTTPS-Antwort erkannt; davon ${mixedContent.activeCount} als aktive Ressource(n).`,
        severity: mixedContent.activeCount > 0 ? 'critical' : 'warning',
        fixSuggestion: 'Lade eingebundene Ressourcen über HTTPS oder entferne die unsichere Einbindung. Prüfe anschließend die Seite erneut.',
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
      xContentTypeOptions: {
        valueObserved: xContentTypeOptions || null,
        nosniff: xContentTypeOptions === 'nosniff',
      },
      referrerPolicyPresent,
      permissionsPolicyPresent,
      cookies: cookieAttributes,
      mixedContent,
      score,
      totalChecks: applicableChecks.length,
      passedChecks,
    },
  };
}

function buildSecurityCategory(headers, finalUrl = 'https://invalid.local/', html = null) {
  return buildSecurityAssessment(headers, finalUrl, html).category;
}

module.exports = {
  analyzeCookieAttributes,
  analyzeMixedContent,
  buildSecurityAssessment,
  buildSecurityCategory,
  DETECTOR_ID,
  DETECTOR_VERSION,
  normalizeSetCookieHeaders,
};