import type { OrganizationRole } from './workspace';

export type AiGovernanceTriState = 'yes' | 'no' | 'unknown';
export type AiGovernanceOrganizationRole = 'provider' | 'deployer' | 'both' | 'unknown';
export type AiGovernanceDeploymentContext = 'internal' | 'customer-facing' | 'embedded' | 'other' | 'unknown';
export type AiGovernanceUseCase =
  | 'content-generation'
  | 'human-interaction'
  | 'decision-support'
  | 'automated-action'
  | 'biometric-or-emotion'
  | 'other';
export type AiGovernanceReviewStatus = 'draft' | 'submitted' | 'reviewed' | 'reopened';
export type AiGovernanceDocumentationState =
  | 'documented_by_declaration'
  | 'not_documented_by_declaration'
  | 'unknown';

export interface AiGovernanceDeclarations {
  interactsDirectlyWithPeople: AiGovernanceTriState;
  generatesSyntheticContent: AiGovernanceTriState;
  aiLiteracyMeasuresDocumented: AiGovernanceTriState;
  humanOversightControlsDocumented: AiGovernanceTriState;
  interactionDisclosureDocumented: AiGovernanceTriState;
  syntheticContentDisclosureDocumented: AiGovernanceTriState;
}

export interface AiSystemDeclarationInput {
  systemName: string;
  organizationRole: AiGovernanceOrganizationRole;
  providerName?: string | null;
  modelName?: string | null;
  deploymentContext: AiGovernanceDeploymentContext;
  useCases: AiGovernanceUseCase[];
  declarations: AiGovernanceDeclarations;
}

export interface AiSystemProfile extends AiSystemDeclarationInput {
  id: string;
  organizationId: string;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiGovernanceLegalSource {
  jurisdiction: string;
  sourceName: string;
  reference: string;
  sourceUrl: string | null;
}

export interface AiGovernanceReviewItem {
  reviewId: string;
  itemKey: string;
  legalSourceId: string;
  legalSource: AiGovernanceLegalSource | null;
  documentationState: AiGovernanceDocumentationState;
  applicabilityState: 'requires_human_review';
  trigger: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiGovernanceReview {
  id: string;
  organizationId: string;
  aiSystemId: string;
  status: AiGovernanceReviewStatus;
  sourceRegistryId: string;
  sourceRegistryVersion: number;
  legalApplicabilityState: 'requires_human_review';
  systemSnapshot: AiSystemDeclarationInput;
  submittedBy: string | null;
  reviewedBy: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: AiGovernanceReviewItem[];
}

export function canEditAiGovernance(role: OrganizationRole | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

export function canReviewAiGovernance(role: OrganizationRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
