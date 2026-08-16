export type GitHubIntegrationStatus = 'active' | 'suspended' | 'deleted';

export interface GitHubInstallation {
  id: string;
  organizationId: string;
  installationId: number;
  accountId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization' | 'Enterprise';
  repositorySelection: 'all' | 'selected' | null;
  status: GitHubIntegrationStatus;
  installedBy: string;
  installedAt: string;
  suspendedAt: string | null;
  deletedAt: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepositorySummary {
  id: number;
  fullName: string;
  private: boolean;
  archived: boolean;
  disabled: boolean;
  defaultBranch: string | null;
}

export interface GitHubInstallSession {
  url: string;
  expiresAt: string;
}

export interface GitHubInstallationCompletion {
  accountLogin: string;
  accountType: 'User' | 'Organization' | 'Enterprise';
  repositorySelection: 'all' | 'selected' | null;
  status: GitHubIntegrationStatus;
}
