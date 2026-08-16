export interface EvidenceExplorerItem {
  id: string;
  organizationId: string;
  scanId: string;
  targetId: string;
  targetDisplayName: string;
  detectorId: string;
  detectorVersion: string;
  type: string;
  source: string;
  normalizedData: Record<string, unknown>;
  contentHash: string | null;
  capturedAt: string;
  createdAt: string;
}

export interface EvidenceExplorerPage {
  evidence: EvidenceExplorerItem[];
  nextCursor: string | null;
}
