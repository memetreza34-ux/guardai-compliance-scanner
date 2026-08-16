export type TrustPublicationStatus = 'published' | 'revoked';

export interface TrustPublicationRecord {
  id: string;
  organizationId: string;
  targetId: string;
  reportSnapshotId: string;
  publicSlug: string;
  organizationNameSnapshot: string;
  status: TrustPublicationStatus;
  createdBy: string;
  publishedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrustPublishResult {
  created: boolean;
  publication: TrustPublicationRecord;
  slugCollision: boolean;
  publicPath: string;
  badgePath: string;
}

export interface TrustPublicationPage {
  publications: TrustPublicationRecord[];
  nextCursor: string | null;
}

export interface PublicTrustProjection {
  schemaVersion: 1;
  publication: {
    id: string;
    publishedAt: string;
  };
  organization: {
    name: string;
  };
  target: {
    type: string;
    displayName: string;
    canonicalUrl: string | null;
  };
  screening: {
    completedAt: string | null;
    modules: string[];
  };
  report: {
    id: string;
    schemaVersion: number;
    snapshotHash: string;
    createdAt: string;
  };
  limitations: string[];
}
