const { HttpError } = require('../lib/httpError');

const ACCESSIBILITY_EVIDENCE_ID = 'accessibility.automated-observation';
const ACCESSIBILITY_EVIDENCE_VERSION = '0.1.0';
const MAX_RULE_RESULTS = 500;
const MAX_TAGS = 100;
const IMPACTS = new Set(['minor', 'moderate', 'serious', 'critical', 'unknown']);

function normalizeHttpsHelpUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  return `${parsed.origin}${parsed.pathname}`.slice(0, 500);
}

function normalizeRuleId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value)) {
    throw new HttpError(502, 'Accessibility engine rule ID is invalid.', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
  }
  return value;
}

function normalizeImpact(value) {
  return typeof value === 'string' && IMPACTS.has(value.toLowerCase())
    ? value.toLowerCase()
    : 'unknown';
}

function normalizeRuleResults(results, bucket) {
  if (!Array.isArray(results) || results.length > MAX_RULE_RESULTS) {
    throw new HttpError(422, `Accessibility ${bucket} results exceed GuardAI limits.`, 'ACCESSIBILITY_ENGINE_RESULT_LIMIT');
  }

  return results.map((result) => {
    if (!result || typeof result !== 'object') {
      throw new HttpError(502, 'Accessibility engine result is invalid.', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
    }
    if (!Array.isArray(result.nodes) || result.nodes.length > 10000) {
      throw new HttpError(422, 'Accessibility engine node count exceeds GuardAI limits.', 'ACCESSIBILITY_ENGINE_RESULT_LIMIT');
    }

    return {
      ruleId: normalizeRuleId(result.id),
      impact: normalizeImpact(result.impact),
      nodeCount: result.nodes.length,
      helpUrl: normalizeHttpsHelpUrl(result.helpUrl),
      tags: Array.isArray(result.tags)
        ? [...new Set(result.tags.filter((tag) => typeof tag === 'string' && tag.length <= 80))]
          .slice(0, MAX_TAGS)
          .sort()
        : [],
    };
  }).sort((left, right) => left.ruleId.localeCompare(right.ruleId));
}

function normalizeEngineMeta(input) {
  if (
    !input ||
    typeof input.engineId !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(input.engineId) ||
    typeof input.engineVersion !== 'string' ||
    !/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,79}$/.test(input.engineVersion)
  ) {
    throw new HttpError(502, 'Accessibility engine provenance is invalid.', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
  }
  return { engineId: input.engineId, engineVersion: input.engineVersion };
}

function buildAccessibilityEvidence(observation) {
  if (!observation || typeof observation !== 'object') {
    throw new HttpError(502, 'Accessibility observation is invalid.', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
  }
  const engine = normalizeEngineMeta(observation);
  let tested;
  try {
    tested = new URL(observation.finalUrl);
  } catch {
    throw new HttpError(502, 'Accessibility final URL is invalid.', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
  }
  if (!['http:', 'https:'].includes(tested.protocol)) {
    throw new HttpError(502, 'Accessibility final URL must use HTTP(S).', 'ACCESSIBILITY_ENGINE_RESULT_INVALID');
  }

  const violations = normalizeRuleResults(observation.violations || [], 'violation');
  const incomplete = normalizeRuleResults(observation.incomplete || [], 'incomplete');
  const passes = normalizeRuleResults(observation.passes || [], 'pass');
  const inapplicable = normalizeRuleResults(observation.inapplicable || [], 'inapplicable');

  const totalNodes = (items) => items.reduce((sum, item) => sum + item.nodeCount, 0);

  return {
    detectorId: ACCESSIBILITY_EVIDENCE_ID,
    detectorVersion: ACCESSIBILITY_EVIDENCE_VERSION,
    evidenceType: 'accessibility-automated-observation',
    source: tested.origin,
    normalizedData: {
      page: {
        finalOrigin: tested.origin,
        finalPath: tested.pathname.slice(0, 500),
      },
      engine,
      summary: {
        violationRuleCount: violations.length,
        violationNodeCount: totalNodes(violations),
        incompleteRuleCount: incomplete.length,
        incompleteNodeCount: totalNodes(incomplete),
        passRuleCount: passes.length,
        passNodeCount: totalNodes(passes),
        inapplicableRuleCount: inapplicable.length,
      },
      violations,
      incomplete,
      passes,
    },
    notices: [
      'This Evidence contains automated accessibility-engine observations only and is not proof of full WCAG or legal accessibility conformance.',
      'Incomplete/manual-review engine results remain separate from violations and passes.',
      'Raw HTML, element text, screenshots, failure summaries and full element selectors are not persisted in this MVP Evidence model.',
    ],
  };
}

module.exports = {
  ACCESSIBILITY_EVIDENCE_ID,
  ACCESSIBILITY_EVIDENCE_VERSION,
  buildAccessibilityEvidence,
  IMPACTS,
  MAX_RULE_RESULTS,
  MAX_TAGS,
  normalizeEngineMeta,
  normalizeHttpsHelpUrl,
  normalizeImpact,
  normalizeRuleId,
  normalizeRuleResults,
};
