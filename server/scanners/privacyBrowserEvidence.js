const { HttpError } = require('../lib/httpError');

const PRIVACY_OBSERVATION_ID = 'privacy.browser-observation';
const PRIVACY_OBSERVATION_VERSION = '0.1.0';
const MAX_NETWORK_REQUESTS = 5000;
const MAX_CROSS_ORIGINS = 100;
const MAX_PRIVACY_LINKS = 20;
const MAX_CONSENT_CONTROLS = 50;
const MAX_CONTROL_LABEL_LENGTH = 120;

const CONSENT_CONTROL_KINDS = new Set(['accept', 'reject', 'manage', 'close', 'unknown']);
const RESOURCE_TYPES = new Set([
  'document', 'stylesheet', 'image', 'media', 'font', 'script',
  'xhr', 'fetch', 'websocket', 'manifest', 'other',
]);

function normalizeUrl(value, field) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(502, `Privacy browser observation contains invalid ${field}.`, 'PRIVACY_BROWSER_OBSERVATION_INVALID');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpError(502, `Privacy browser observation ${field} must use HTTP(S).`, 'PRIVACY_BROWSER_OBSERVATION_INVALID');
  }
  return parsed;
}

function normalizeResourceType(value) {
  return typeof value === 'string' && RESOURCE_TYPES.has(value.toLowerCase())
    ? value.toLowerCase()
    : 'other';
}

function normalizeRequestSummary(requests, targetOrigin) {
  if (!Array.isArray(requests) || requests.length > MAX_NETWORK_REQUESTS) {
    throw new HttpError(422, 'Privacy browser network observation exceeds GuardAI limits.', 'PRIVACY_BROWSER_OBSERVATION_LIMIT');
  }

  const crossOrigins = new Set();
  const resourceTypes = {};
  let sameOriginCount = 0;
  let crossOriginCount = 0;

  for (const request of requests) {
    if (!request || typeof request !== 'object') {
      throw new HttpError(502, 'Privacy browser request observation is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
    }
    const parsed = normalizeUrl(request.url, 'request URL');
    const type = normalizeResourceType(request.resourceType);
    resourceTypes[type] = (resourceTypes[type] || 0) + 1;

    if (parsed.origin === targetOrigin) {
      sameOriginCount += 1;
    } else {
      crossOriginCount += 1;
      if (crossOrigins.size < MAX_CROSS_ORIGINS) crossOrigins.add(parsed.origin);
    }
  }

  return {
    totalCount: requests.length,
    sameOriginCount,
    crossOriginCount,
    crossOriginOrigins: [...crossOrigins].sort(),
    crossOriginOriginsTruncated: crossOriginCount > 0 && crossOrigins.size >= MAX_CROSS_ORIGINS,
    resourceTypes,
  };
}

function normalizeCookieSummary(cookies, targetHost) {
  if (!Array.isArray(cookies) || cookies.length > 1000) {
    throw new HttpError(422, 'Privacy browser cookie observation exceeds GuardAI limits.', 'PRIVACY_BROWSER_OBSERVATION_LIMIT');
  }

  let targetHostScoped = 0;
  let otherDomainScoped = 0;
  let secureCount = 0;
  let httpOnlyCount = 0;
  const sameSite = { strict: 0, lax: 0, none: 0, unspecified: 0 };
  const domains = new Set();

  for (const cookie of cookies) {
    if (!cookie || typeof cookie !== 'object' || typeof cookie.domain !== 'string') {
      throw new HttpError(502, 'Privacy browser cookie observation is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
    }
    const domain = cookie.domain.trim().toLowerCase().replace(/^\./, '');
    if (!domain || domain.length > 253 || !/^[a-z0-9.-]+$/.test(domain)) {
      throw new HttpError(502, 'Privacy browser cookie domain is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
    }
    if (domains.size < 100) domains.add(domain);

    if (targetHost === domain || targetHost.endsWith(`.${domain}`)) targetHostScoped += 1;
    else otherDomainScoped += 1;
    if (cookie.secure === true) secureCount += 1;
    if (cookie.httpOnly === true) httpOnlyCount += 1;

    const mode = typeof cookie.sameSite === 'string' ? cookie.sameSite.toLowerCase() : '';
    if (mode === 'strict' || mode === 'lax' || mode === 'none') sameSite[mode] += 1;
    else sameSite.unspecified += 1;
  }

  return {
    totalCount: cookies.length,
    targetHostScoped,
    otherDomainScoped,
    secureCount,
    httpOnlyCount,
    sameSite,
    domains: [...domains].sort(),
    domainsTruncated: cookies.length > 0 && domains.size >= 100,
  };
}

function normalizeStorageSummary(storage) {
  if (!storage || typeof storage !== 'object') {
    return { localStorageEntryCount: 0, sessionStorageEntryCount: 0 };
  }
  const local = Number(storage.localStorageEntryCount ?? 0);
  const session = Number(storage.sessionStorageEntryCount ?? 0);
  if (!Number.isSafeInteger(local) || local < 0 || !Number.isSafeInteger(session) || session < 0) {
    throw new HttpError(502, 'Privacy browser storage observation is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
  }
  return {
    localStorageEntryCount: local,
    sessionStorageEntryCount: session,
  };
}

function normalizePrivacyLinks(links, finalUrl) {
  if (!Array.isArray(links)) return [];
  if (links.length > 200) {
    throw new HttpError(422, 'Privacy-link observation exceeds GuardAI limits.', 'PRIVACY_BROWSER_OBSERVATION_LIMIT');
  }

  const normalized = [];
  const seen = new Set();
  for (const link of links) {
    if (normalized.length >= MAX_PRIVACY_LINKS) break;
    if (!link || typeof link !== 'object' || typeof link.href !== 'string') continue;
    let parsed;
    try {
      parsed = new URL(link.href, finalUrl);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) continue;
    const safe = `${parsed.origin}${parsed.pathname}`.slice(0, 500);
    if (seen.has(safe)) continue;
    seen.add(safe);
    normalized.push({
      urlWithoutQuery: safe,
      sameOrigin: parsed.origin === new URL(finalUrl).origin,
    });
  }
  return normalized;
}

function normalizeConsentControls(controls) {
  if (!Array.isArray(controls)) return [];
  if (controls.length > 500) {
    throw new HttpError(422, 'Consent-control observation exceeds GuardAI limits.', 'PRIVACY_BROWSER_OBSERVATION_LIMIT');
  }

  return controls.slice(0, MAX_CONSENT_CONTROLS).map((control) => {
    const kind = typeof control?.kind === 'string' && CONSENT_CONTROL_KINDS.has(control.kind.toLowerCase())
      ? control.kind.toLowerCase()
      : 'unknown';
    const label = typeof control?.label === 'string'
      ? control.label.replace(/\s+/g, ' ').trim().slice(0, MAX_CONTROL_LABEL_LENGTH)
      : '';
    return { kind, label };
  });
}

function normalizePhase(phase, finalUrl) {
  if (!phase || typeof phase !== 'object') {
    throw new HttpError(502, 'Privacy browser phase observation is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
  }
  const final = normalizeUrl(finalUrl, 'final URL');
  return {
    network: normalizeRequestSummary(phase.requests || [], final.origin),
    cookies: normalizeCookieSummary(phase.cookies || [], final.hostname.toLowerCase()),
    storage: normalizeStorageSummary(phase.storage),
  };
}

function buildPrivacyBrowserEvidence(observation) {
  if (!observation || typeof observation !== 'object') {
    throw new HttpError(502, 'Privacy browser observation is invalid.', 'PRIVACY_BROWSER_OBSERVATION_INVALID');
  }
  const finalUrl = normalizeUrl(observation.finalUrl, 'final URL').toString();
  const initial = normalizePhase(observation.initial, finalUrl);
  const afterReject = observation.afterReject ? normalizePhase(observation.afterReject, finalUrl) : null;
  const controls = normalizeConsentControls(observation.consentControls);
  const privacyLinks = normalizePrivacyLinks(observation.privacyLinks, finalUrl);

  const action = observation.rejectAction && typeof observation.rejectAction === 'object'
    ? {
        attempted: observation.rejectAction.attempted === true,
        completed: observation.rejectAction.completed === true,
      }
    : { attempted: false, completed: false };

  return {
    detectorId: PRIVACY_OBSERVATION_ID,
    detectorVersion: PRIVACY_OBSERVATION_VERSION,
    evidenceType: 'privacy-browser-observation',
    source: new URL(finalUrl).origin,
    normalizedData: {
      page: {
        finalOrigin: new URL(finalUrl).origin,
        finalPath: new URL(finalUrl).pathname.slice(0, 500),
      },
      initial,
      afterReject,
      consent: {
        bannerDetected: observation.consentBannerDetected === true,
        controls,
        rejectAction: action,
      },
      privacyLinks,
    },
    notices: [
      'Cross-origin network requests are technical observations and are not automatically classified as trackers.',
      'This Evidence does not determine whether consent is legally required, valid or sufficient.',
      'Cookie values, Web Storage values, request query strings and URL fragments are not persisted in this Privacy Evidence.',
    ],
  };
}

module.exports = {
  buildPrivacyBrowserEvidence,
  CONSENT_CONTROL_KINDS,
  MAX_CONSENT_CONTROLS,
  MAX_CROSS_ORIGINS,
  MAX_NETWORK_REQUESTS,
  MAX_PRIVACY_LINKS,
  normalizeConsentControls,
  normalizeCookieSummary,
  normalizePrivacyLinks,
  normalizeRequestSummary,
  normalizeStorageSummary,
  PRIVACY_OBSERVATION_ID,
  PRIVACY_OBSERVATION_VERSION,
  RESOURCE_TYPES,
};
