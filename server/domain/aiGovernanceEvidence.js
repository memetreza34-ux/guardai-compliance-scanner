const sourceRegistry = require('../../shared/legal-sources/eu-ai-act-guided-review-v1.json');
const { HttpError } = require('../lib/httpError');

const AI_GOVERNANCE_DETECTOR_ID = 'ai-governance.guided-review';
const AI_GOVERNANCE_DETECTOR_VERSION = '0.1.0';

const ORGANIZATION_ROLES = new Set(['provider', 'deployer', 'both', 'unknown']);
const DEPLOYMENT_CONTEXTS = new Set(['internal', 'customer-facing', 'embedded', 'other', 'unknown']);
const USE_CASES = new Set([
  'content-generation',
  'human-interaction',
  'decision-support',
  'automated-action',
  'biometric-or-emotion',
  'other',
]);
const TRI_STATE = new Set(['yes', 'no', 'unknown']);

function normalizeBoundedText(value, field, maxLength, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is invalid.`, 'AI_GOVERNANCE_DECLARATION_INVALID');
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new HttpError(400, `${field} is invalid.`, 'AI_GOVERNANCE_DECLARATION_INVALID');
  }
  return normalized;
}

function normalizeEnum(value, allowed, field, fallback = 'unknown') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new HttpError(400, `${field} is invalid.`, 'AI_GOVERNANCE_DECLARATION_INVALID');
  }
  return value;
}

function normalizeUseCases(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw new HttpError(400, 'AI Governance use cases are invalid.', 'AI_GOVERNANCE_DECLARATION_INVALID');
  }
  const unique = [...new Set(value)];
  if (unique.some((entry) => typeof entry !== 'string' || !USE_CASES.has(entry))) {
    throw new HttpError(400, 'AI Governance use cases are invalid.', 'AI_GOVERNANCE_DECLARATION_INVALID');
  }
  return unique.sort();
}

function normalizeDeclarations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'AI Governance declarations are invalid.', 'AI_GOVERNANCE_DECLARATION_INVALID');
  }

  return {
    interactsDirectlyWithPeople: normalizeEnum(
      input.interactsDirectlyWithPeople,
      TRI_STATE,
      'interactsDirectlyWithPeople',
    ),
    generatesSyntheticContent: normalizeEnum(
      input.generatesSyntheticContent,
      TRI_STATE,
      'generatesSyntheticContent',
    ),
    aiLiteracyMeasuresDocumented: normalizeEnum(
      input.aiLiteracyMeasuresDocumented,
      TRI_STATE,
      'aiLiteracyMeasuresDocumented',
    ),
    humanOversightControlsDocumented: normalizeEnum(
      input.humanOversightControlsDocumented,
      TRI_STATE,
      'humanOversightControlsDocumented',
    ),
    interactionDisclosureDocumented: normalizeEnum(
      input.interactionDisclosureDocumented,
      TRI_STATE,
      'interactionDisclosureDocumented',
    ),
    syntheticContentDisclosureDocumented: normalizeEnum(
      input.syntheticContentDisclosureDocumented,
      TRI_STATE,
      'syntheticContentDisclosureDocumented',
    ),
  };
}

function normalizeAiSystemDeclaration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'AI Governance declaration is required.', 'AI_GOVERNANCE_DECLARATION_INVALID');
  }

  return {
    systemName: normalizeBoundedText(input.systemName, 'systemName', 160),
    organizationRole: normalizeEnum(input.organizationRole, ORGANIZATION_ROLES, 'organizationRole'),
    providerName: normalizeBoundedText(input.providerName, 'providerName', 160, { optional: true }),
    modelName: normalizeBoundedText(input.modelName, 'modelName', 160, { optional: true }),
    deploymentContext: normalizeEnum(input.deploymentContext, DEPLOYMENT_CONTEXTS, 'deploymentContext'),
    useCases: normalizeUseCases(input.useCases),
    declarations: normalizeDeclarations(input.declarations),
  };
}

function documentationState(value) {
  if (value === 'yes') return 'documented_by_declaration';
  if (value === 'no') return 'not_documented_by_declaration';
  return 'unknown';
}

function legalSource(key) {
  const source = sourceRegistry.sources.find((candidate) => candidate.key === key);
  if (!source) {
    throw new Error(`Unknown AI Governance legal source key: ${key}`);
  }
  return {
    key: source.key,
    article: source.article,
    title: source.title,
  };
}

function buildGuidedReviewItems(declaration) {
  const d = declaration.declarations;
  const items = [
    {
      key: 'ai-literacy-measures',
      legalSource: legalSource('eu-ai-act-2024-1689-art-4'),
      documentationState: documentationState(d.aiLiteracyMeasuresDocumented),
      applicabilityState: 'requires_human_review',
      trigger: 'organization_role_and_context_must_be_reviewed',
    },
    {
      key: 'human-oversight-controls',
      legalSource: legalSource('eu-ai-act-2024-1689-art-14'),
      documentationState: documentationState(d.humanOversightControlsDocumented),
      applicabilityState: 'requires_human_review',
      trigger: 'high_risk_applicability_not_determined_by_guardai',
    },
  ];

  const humanInteractionDeclared = d.interactsDirectlyWithPeople === 'yes' || declaration.useCases.includes('human-interaction');
  items.push({
    key: 'human-interaction-transparency',
    legalSource: legalSource('eu-ai-act-2024-1689-art-50'),
    documentationState: documentationState(d.interactionDisclosureDocumented),
    applicabilityState: 'requires_human_review',
    trigger: humanInteractionDeclared
      ? 'human_interaction_declared'
      : 'not_triggered_by_current_declaration',
  });

  const syntheticContentDeclared = d.generatesSyntheticContent === 'yes' || declaration.useCases.includes('content-generation');
  items.push({
    key: 'synthetic-content-transparency',
    legalSource: legalSource('eu-ai-act-2024-1689-art-50'),
    documentationState: documentationState(d.syntheticContentDisclosureDocumented),
    applicabilityState: 'requires_human_review',
    trigger: syntheticContentDeclared
      ? 'synthetic_content_declared'
      : 'not_triggered_by_current_declaration',
  });

  return items;
}

function buildAiGovernanceGuidedReviewEvidence(input) {
  const declaration = normalizeAiSystemDeclaration(input);
  const reviewItems = buildGuidedReviewItems(declaration);

  return {
    state: 'observed',
    score: null,
    detectorId: AI_GOVERNANCE_DETECTOR_ID,
    detectorVersion: AI_GOVERNANCE_DETECTOR_VERSION,
    evidenceType: 'ai-governance-guided-review',
    source: 'organization-declaration',
    normalizedData: {
      declaration,
      reviewItems,
      legalSourceRegistry: {
        registryId: sourceRegistry.registryId,
        version: sourceRegistry.version,
        jurisdiction: sourceRegistry.jurisdiction,
        instrument: sourceRegistry.instrument,
      },
      legalAssessment: {
        performedByGuardAI: false,
        applicabilityDetermined: false,
        requiresHumanReview: true,
      },
    },
    issues: [],
    notices: [
      'This guided review stores organization declarations and documentation status; it does not determine EU AI Act applicability or legal compliance.',
      'GuardAI does not classify the declared system as prohibited, high-risk or otherwise regulated from this questionnaire alone.',
      'Sample prompts, model outputs, customer content and personal data are outside this MVP declaration schema and are not retained by this Evidence builder.',
    ],
  };
}

module.exports = {
  AI_GOVERNANCE_DETECTOR_ID,
  AI_GOVERNANCE_DETECTOR_VERSION,
  buildAiGovernanceGuidedReviewEvidence,
  buildGuidedReviewItems,
  DEPLOYMENT_CONTEXTS,
  documentationState,
  normalizeAiSystemDeclaration,
  normalizeDeclarations,
  normalizeUseCases,
  ORGANIZATION_ROLES,
  TRI_STATE,
  USE_CASES,
};
