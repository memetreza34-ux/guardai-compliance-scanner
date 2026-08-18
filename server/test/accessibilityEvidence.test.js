const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAccessibilityEvidence } = require('../scanners/accessibilityEvidence');

test('accessibility Evidence keeps rule provenance/counts but drops DOM content and selectors', () => {
  const htmlSecret = 'customer-account-secret';
  const selectorSecret = '#user-12345-private';
  const evidence = buildAccessibilityEvidence({
    engineId: 'axe-core',
    engineVersion: '4.10.0',
    finalUrl: 'https://example.com/account?token=query-secret#profile',
    violations: [{
      id: 'color-contrast',
      impact: 'serious',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI',
      tags: ['cat.color', 'wcag2aa', 'wcag143'],
      nodes: [{
        html: `<div>${htmlSecret}</div>`,
        target: [selectorSecret],
        failureSummary: `Sensitive ${htmlSecret}`,
      }],
    }],
    incomplete: [{
      id: 'color-contrast-enhanced',
      impact: null,
      helpUrl: 'https://example.org/help?secret=value',
      tags: ['wcag21aaa'],
      nodes: [{ html: '<span>manual review</span>' }],
    }],
    passes: [{
      id: 'document-title',
      impact: null,
      helpUrl: 'https://example.org/title',
      tags: ['wcag2a'],
      nodes: [{ html: '<title>Private title</title>' }],
    }],
    inapplicable: [],
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(htmlSecret), false);
  assert.equal(serialized.includes(selectorSecret), false);
  assert.equal(serialized.includes('query-secret'), false);
  assert.equal(serialized.includes('Private title'), false);

  assert.equal(evidence.normalizedData.engine.engineId, 'axe-core');
  assert.equal(evidence.normalizedData.engine.engineVersion, '4.10.0');
  assert.equal(evidence.normalizedData.summary.violationRuleCount, 1);
  assert.equal(evidence.normalizedData.summary.violationNodeCount, 1);
  assert.equal(evidence.normalizedData.summary.incompleteRuleCount, 1);
  assert.equal(evidence.normalizedData.violations[0].ruleId, 'color-contrast');
  assert.equal(evidence.normalizedData.violations[0].helpUrl, 'https://dequeuniversity.com/rules/axe/4.10/color-contrast');
  assert.equal(Object.prototype.hasOwnProperty.call(evidence.normalizedData.violations[0], 'html'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(evidence.normalizedData.violations[0], 'target'), false);
});

test('incomplete results remain separate from violations instead of being treated as pass/fail', () => {
  const evidence = buildAccessibilityEvidence({
    engineId: 'test-engine',
    engineVersion: '1.0.0',
    finalUrl: 'https://example.com/',
    violations: [],
    incomplete: [{
      id: 'manual-check',
      impact: 'moderate',
      tags: ['manual'],
      nodes: [{}, {}],
    }],
    passes: [],
    inapplicable: [],
  });

  assert.equal(evidence.normalizedData.summary.violationRuleCount, 0);
  assert.equal(evidence.normalizedData.summary.incompleteRuleCount, 1);
  assert.equal(evidence.normalizedData.summary.incompleteNodeCount, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(evidence, 'score'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(evidence, 'compliant'), false);
});

test('oversized accessibility rule population fails closed', () => {
  const violations = Array.from({ length: 501 }, (_, index) => ({
    id: `rule-${index}`,
    impact: 'minor',
    nodes: [],
  }));
  assert.throws(
    () => buildAccessibilityEvidence({
      engineId: 'test-engine',
      engineVersion: '1.0.0',
      finalUrl: 'https://example.com/',
      violations,
      incomplete: [],
      passes: [],
      inapplicable: [],
    }),
    (error) => error.code === 'ACCESSIBILITY_ENGINE_RESULT_LIMIT' && error.statusCode === 422,
  );
});
