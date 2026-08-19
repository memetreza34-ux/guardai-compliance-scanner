export type RuleSeverity = 'critical' | 'warning' | 'info';

export interface RuleDefinition {
  rulesetId: string;
  rulesetVersion: number;
  detectorId: string;
  detectorVersion: string;
  rule: {
    findingId: string;
    category: string;
    defaultSeverity: RuleSeverity;
    evidenceRequirements: string[];
    detectorLogic: string;
    severityLogic: string;
    confidenceLogic: string;
    messageTemplate: string;
    remediation: string;
    requirementMappings: string[];
    changelog: string;
  };
}

export interface RuleCatalogItem {
  id: string;
  category: string;
  title: string;
  currentVersion: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleVersionItem {
  ruleId: string;
  version: number;
  implementationVersion: string;
  legalSourceIds: string[];
  definition: RuleDefinition;
  definitionHash: string;
  changedAt: string;
}
