export interface RuleCatalogItem {
  id: string;
  framework: string;
  category: string;
  controlKey: string;
  title: string;
  status: 'active' | 'deprecated' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface RuleVersionItem {
  ruleId: string;
  version: number;
  implementationVersion: string;
  rationale: string;
  legalSourceIds: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}
