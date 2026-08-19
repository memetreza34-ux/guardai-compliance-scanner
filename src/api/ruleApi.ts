import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type { RuleCatalogItem, RuleDefinition, RuleSeverity, RuleVersionItem } from '../types/ruleCatalog';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(label: string): never {
  throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  return isRecord(value) ? value : invalid(label);
}

function requireArray(value: unknown, label: string): unknown[] {
  return Array.isArray(value) ? value : invalid(label);
}

function stringArray(value: unknown, label: string): string[] {
  const list = requireArray(value, label);
  if (!list.every((entry) => typeof entry === 'string')) return invalid(label);
  return list as string[];
}

function parseRule(value: unknown): RuleCatalogItem {
  const item = requireRecord(value, 'Rule');
  if (
    typeof item.id !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.title !== 'string' ||
    !Number.isInteger(item.currentVersion) ||
    typeof item.active !== 'boolean' ||
    typeof item.createdAt !== 'string' ||
    typeof item.updatedAt !== 'string'
  ) return invalid('Rule');

  return item as unknown as RuleCatalogItem;
}

function parseDefinition(value: unknown): RuleDefinition {
  const definition = requireRecord(value, 'Rule definition');
  const rule = requireRecord(definition.rule, 'Rule definition');
  const severity = rule.defaultSeverity;
  if (
    typeof definition.rulesetId !== 'string' ||
    !Number.isInteger(definition.rulesetVersion) ||
    typeof definition.detectorId !== 'string' ||
    typeof definition.detectorVersion !== 'string' ||
    typeof rule.findingId !== 'string' ||
    typeof rule.category !== 'string' ||
    !['critical', 'warning', 'info'].includes(String(severity)) ||
    typeof rule.detectorLogic !== 'string' ||
    typeof rule.severityLogic !== 'string' ||
    typeof rule.confidenceLogic !== 'string' ||
    typeof rule.messageTemplate !== 'string' ||
    typeof rule.remediation !== 'string' ||
    typeof rule.changelog !== 'string'
  ) return invalid('Rule definition');

  const evidenceRequirements = stringArray(rule.evidenceRequirements, 'Rule evidence requirements');
  const requirementMappings = stringArray(rule.requirementMappings, 'Rule requirement mappings');
  return {
    rulesetId: definition.rulesetId,
    rulesetVersion: definition.rulesetVersion as number,
    detectorId: definition.detectorId,
    detectorVersion: definition.detectorVersion,
    rule: {
      findingId: rule.findingId,
      category: rule.category,
      defaultSeverity: severity as RuleSeverity,
      evidenceRequirements,
      detectorLogic: rule.detectorLogic,
      severityLogic: rule.severityLogic,
      confidenceLogic: rule.confidenceLogic,
      messageTemplate: rule.messageTemplate,
      remediation: rule.remediation,
      requirementMappings,
      changelog: rule.changelog,
    },
  };
}

function parseRuleVersion(value: unknown): RuleVersionItem {
  const item = requireRecord(value, 'Rule version');
  if (
    typeof item.ruleId !== 'string' ||
    !Number.isInteger(item.version) ||
    typeof item.implementationVersion !== 'string' ||
    typeof item.definitionHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(item.definitionHash) ||
    typeof item.changedAt !== 'string'
  ) return invalid('Rule version');

  return {
    ruleId: item.ruleId,
    version: item.version as number,
    implementationVersion: item.implementationVersion,
    legalSourceIds: stringArray(item.legalSourceIds, 'Rule legal sources'),
    definition: parseDefinition(item.definition),
    definitionHash: item.definitionHash,
    changedAt: item.changedAt,
  };
}

export function createRuleApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listRules(options: {
    category?: string;
    active?: boolean;
    limit?: number;
  } = {}): Promise<RuleCatalogItem[]> {
    const search = new URLSearchParams();
    if (options.category) search.set('category', options.category);
    if (options.active !== undefined) search.set('active', String(options.active));
    if (options.limit !== undefined) search.set('limit', String(options.limit));
    const suffix = search.size > 0 ? `?${search.toString()}` : '';
    const payload = requireRecord(await client.request(`/rules${suffix}`), 'Rule Catalog');
    return requireArray(payload.rules, 'Rule Catalog').map(parseRule);
  }

  async function getRule(ruleId: string): Promise<RuleCatalogItem> {
    const payload = requireRecord(
      await client.request(`/rules/${encodeURIComponent(ruleId)}`),
      'Rule read',
    );
    return parseRule(payload.rule);
  }

  async function listVersions(ruleId: string): Promise<{
    rule: RuleCatalogItem;
    versions: RuleVersionItem[];
  }> {
    const payload = requireRecord(
      await client.request(`/rules/${encodeURIComponent(ruleId)}/versions`),
      'Rule versions',
    );
    return {
      rule: parseRule(payload.rule),
      versions: requireArray(payload.versions, 'Rule versions').map(parseRuleVersion),
    };
  }

  async function getVersion(ruleId: string, version: number): Promise<{
    rule: RuleCatalogItem;
    version: RuleVersionItem;
  }> {
    const payload = requireRecord(
      await client.request(`/rules/${encodeURIComponent(ruleId)}/versions/${version}`),
      'Rule version',
    );
    return {
      rule: parseRule(payload.rule),
      version: parseRuleVersion(payload.version),
    };
  }

  return { getRule, getVersion, listRules, listVersions };
}

export type RuleApi = ReturnType<typeof createRuleApi>;
