import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type { RuleCatalogItem, RuleVersionItem } from '../types/ruleCatalog';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

export function createRuleApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listRules(options: {
    framework?: string;
    status?: RuleCatalogItem['status'];
    limit?: number;
  } = {}): Promise<RuleCatalogItem[]> {
    const search = new URLSearchParams();
    if (options.framework) search.set('framework', options.framework);
    if (options.status) search.set('status', options.status);
    if (options.limit !== undefined) search.set('limit', String(options.limit));
    const suffix = search.size > 0 ? `?${search.toString()}` : '';
    const payload = requireRecord(await client.request(`/rules${suffix}`), 'Rule Catalog');
    return requireArray(payload.rules, 'Rule Catalog') as RuleCatalogItem[];
  }

  async function getRule(ruleId: string): Promise<RuleCatalogItem> {
    const payload = requireRecord(
      await client.request(`/rules/${encodeURIComponent(ruleId)}`),
      'Rule read',
    );
    return requireRecord(payload.rule, 'Rule') as unknown as RuleCatalogItem;
  }

  async function listVersions(ruleId: string): Promise<{
    rule: RuleCatalogItem;
    versions: RuleVersionItem[];
  }> {
    const payload = requireRecord(
      await client.request(`/rules/${encodeURIComponent(ruleId)}/versions`),
      'Rule versions',
    );
    const rule = requireRecord(payload.rule, 'Rule') as unknown as RuleCatalogItem;
    const versions = requireArray(payload.versions, 'Rule versions') as RuleVersionItem[];
    return { rule, versions };
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
      rule: requireRecord(payload.rule, 'Rule') as unknown as RuleCatalogItem,
      version: requireRecord(payload.version, 'Rule version') as unknown as RuleVersionItem,
    };
  }

  return { getRule, getVersion, listRules, listVersions };
}

export type RuleApi = ReturnType<typeof createRuleApi>;
