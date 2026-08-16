const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');

const PUBLIC_TRUST_SCHEMA_VERSION = 1;
const PUBLIC_SLUG_PATTERN = /^[A-Za-z0-9_-]{24,80}$/;

function createPublicTrustSlug() {
  return crypto.randomBytes(24).toString('base64url');
}

function assertPublicTrustSlug(value) {
  if (typeof value !== 'string' || !PUBLIC_SLUG_PATTERN.test(value)) {
    throw new HttpError(404, 'Public Trust publication was not found.', 'TRUST_PUBLICATION_NOT_FOUND');
  }
  return value;
}

function buildPublicTrustProjection(publication, report) {
  const snapshot = report?.snapshot;
  if (!publication || !snapshot || snapshot.reportType !== 'technical-screening') {
    throw new HttpError(500, 'Public Trust publication source is invalid.', 'TRUST_PUBLICATION_INVALID');
  }

  return {
    schemaVersion: PUBLIC_TRUST_SCHEMA_VERSION,
    publication: {
      id: publication.id,
      publishedAt: publication.publishedAt,
    },
    organization: {
      name: publication.organizationNameSnapshot,
    },
    target: {
      type: snapshot.target.type,
      displayName: snapshot.target.displayName,
      canonicalUrl: snapshot.target.canonicalUrl,
    },
    screening: {
      completedAt: snapshot.scan.completedAt,
      modules: [...snapshot.scan.requestedModules],
    },
    report: {
      id: report.id,
      schemaVersion: report.schemaVersion,
      snapshotHash: report.snapshotHash,
      createdAt: report.createdAt,
    },
    limitations: [
      'This publication confirms only that the listed GuardAI technical screening scope was completed at the stated time.',
      'It is not a compliance certification, legal opinion, penetration test or guarantee that no vulnerabilities exist.',
      'Detailed findings and Evidence are intentionally not exposed by the public Trust projection.',
    ],
  };
}

module.exports = {
  assertPublicTrustSlug,
  buildPublicTrustProjection,
  createPublicTrustSlug,
  PUBLIC_TRUST_SCHEMA_VERSION,
};
