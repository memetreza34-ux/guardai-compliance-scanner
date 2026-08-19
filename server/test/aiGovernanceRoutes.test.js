const test = require('node:test');
const assert = require('node:assert/strict');
const { declarationSchema } = require('../routes/aiGovernanceRoutes');

function validDeclaration() {
  return {
    systemName: 'Support Assistant',
    organizationRole: 'deployer',
    providerName: 'Example Provider',
    modelName: 'Example Model',
    deploymentContext: 'customer-facing',
    useCases: ['human-interaction'],
    declarations: {
      interactsDirectlyWithPeople: 'yes',
      generatesSyntheticContent: 'unknown',
      aiLiteracyMeasuresDocumented: 'yes',
      humanOversightControlsDocumented: 'unknown',
      interactionDisclosureDocumented: 'no',
      syntheticContentDisclosureDocumented: 'unknown',
    },
  };
}

test('AI Governance HTTP declaration schema rejects prompt/output/customer-content fields', () => {
  for (const extraField of ['samplePrompt', 'sampleOutput', 'customerContent', 'legalConclusion']) {
    assert.throws(
      () => declarationSchema.parse({ ...validDeclaration(), [extraField]: 'must-not-enter-api' }),
    );
  }
});

test('AI Governance nested declarations reject arbitrary free-form fields', () => {
  assert.throws(() => declarationSchema.parse({
    ...validDeclaration(),
    declarations: {
      ...validDeclaration().declarations,
      rawPromptExample: 'must-not-enter-api',
    },
  }));
});

test('AI Governance HTTP schema accepts only bounded structured declarations', () => {
  const parsed = declarationSchema.parse(validDeclaration());
  assert.equal(parsed.systemName, 'Support Assistant');
  assert.deepEqual(parsed.useCases, ['human-interaction']);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'samplePrompt'), false);
});
