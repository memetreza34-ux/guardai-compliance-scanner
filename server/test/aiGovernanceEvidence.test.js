const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAiGovernanceGuidedReviewEvidence,
  normalizeAiSystemDeclaration,
} = require('../domain/aiGovernanceEvidence');

function declaration(overrides = {}) {
  return {
    systemName: 'Support Assistant',
    organizationRole: 'deployer',
    providerName: 'Example Provider',
    modelName: 'Example Model',
    deploymentContext: 'customer-facing',
    useCases: ['human-interaction', 'content-generation'],
    declarations: {
      interactsDirectlyWithPeople: 'yes',
      generatesSyntheticContent: 'yes',
      aiLiteracyMeasuresDocumented: 'yes',
      humanOversightControlsDocumented: 'yes',
      interactionDisclosureDocumented: 'no',
      syntheticContentDisclosureDocumented: 'unknown',
    },
    ...overrides,
  };
}

test('AI Governance guided review remains observed and unscored', () => {
  const evidence = buildAiGovernanceGuidedReviewEvidence(declaration());

  assert.equal(evidence.state, 'observed');
  assert.equal(evidence.score, null);
  assert.deepEqual(evidence.issues, []);
  assert.equal(evidence.detectorId, 'ai-governance.guided-review');
  assert.equal(evidence.normalizedData.legalAssessment.performedByGuardAI, false);
  assert.equal(evidence.normalizedData.legalAssessment.applicabilityDetermined, false);
  assert.equal(evidence.normalizedData.legalAssessment.requiresHumanReview, true);
});

test('documented controls never become automatic legal-compliance verdicts', () => {
  const evidence = buildAiGovernanceGuidedReviewEvidence(declaration());
  const literacy = evidence.normalizedData.reviewItems.find((item) => item.key === 'ai-literacy-measures');
  const oversight = evidence.normalizedData.reviewItems.find((item) => item.key === 'human-oversight-controls');

  assert.equal(literacy.documentationState, 'documented_by_declaration');
  assert.equal(literacy.applicabilityState, 'requires_human_review');
  assert.equal(oversight.documentationState, 'documented_by_declaration');
  assert.equal(oversight.applicabilityState, 'requires_human_review');
  assert.equal(oversight.trigger, 'high_risk_applicability_not_determined_by_guardai');
});

test('Article 50 review items record declaration triggers without deciding applicability', () => {
  const evidence = buildAiGovernanceGuidedReviewEvidence(declaration());
  const interaction = evidence.normalizedData.reviewItems.find((item) => item.key === 'human-interaction-transparency');
  const synthetic = evidence.normalizedData.reviewItems.find((item) => item.key === 'synthetic-content-transparency');

  assert.equal(interaction.trigger, 'human_interaction_declared');
  assert.equal(interaction.documentationState, 'not_documented_by_declaration');
  assert.equal(interaction.applicabilityState, 'requires_human_review');
  assert.equal(synthetic.trigger, 'synthetic_content_declared');
  assert.equal(synthetic.applicabilityState, 'requires_human_review');
});

test('raw prompts, outputs and customer content are ignored by the allowlisted declaration schema', () => {
  const promptSecret = 'prompt-secret-should-never-persist';
  const outputSecret = 'output-secret-should-never-persist';
  const customerSecret = 'customer-secret-should-never-persist';

  const evidence = buildAiGovernanceGuidedReviewEvidence({
    ...declaration(),
    samplePrompt: promptSecret,
    sampleOutput: outputSecret,
    customerContent: customerSecret,
    declarations: {
      ...declaration().declarations,
      rawPromptExample: promptSecret,
    },
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(promptSecret), false);
  assert.equal(serialized.includes(outputSecret), false);
  assert.equal(serialized.includes(customerSecret), false);
  assert.equal(Object.prototype.hasOwnProperty.call(evidence.normalizedData.declaration.declarations, 'rawPromptExample'), false);
});

test('invalid AI Governance enum values fail closed', () => {
  assert.throws(
    () => normalizeAiSystemDeclaration(declaration({ organizationRole: 'certified-provider' })),
    (error) => error.code === 'AI_GOVERNANCE_DECLARATION_INVALID' && error.statusCode === 400,
  );

  assert.throws(
    () => normalizeAiSystemDeclaration(declaration({ useCases: ['legal-guarantee'] })),
    (error) => error.code === 'AI_GOVERNANCE_DECLARATION_INVALID',
  );
});
