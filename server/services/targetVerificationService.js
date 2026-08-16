const dns = require('node:dns').promises;
const { HttpError } = require('../lib/httpError');
const {
  createDnsVerificationChallenge,
  txtRecordsMatchTokenHash,
} = require('../domain/targetVerification');

function createTargetVerificationService({
  organizationAuthorization,
  targetVerificationRepository,
  resolveTxt = dns.resolveTxt.bind(dns),
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Target verification requires organization authorization.');
  }
  if (!targetVerificationRepository) {
    throw new TypeError('Target verification requires a repository.');
  }

  async function requireAdmin(organizationId, userId) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
  }

  async function startDnsChallenge({ organizationId, targetId, userId }) {
    await requireAdmin(organizationId, userId);
    const target = await targetVerificationRepository.getTarget(organizationId, targetId);

    if (!target) {
      throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
    }
    if (target.type !== 'website') {
      throw new HttpError(400, 'DNS verification is currently available only for website targets.', 'VERIFICATION_METHOD_UNSUPPORTED');
    }
    if (target.verification_state === 'verified') {
      throw new HttpError(409, 'Target is already verified.', 'TARGET_ALREADY_VERIFIED');
    }

    const generated = createDnsVerificationChallenge(target.canonical_url);
    const stored = await targetVerificationRepository.createDnsChallenge({
      organizationId,
      targetId,
      createdBy: userId,
      tokenHash: generated.tokenHash,
      dnsRecordName: generated.dnsRecordName,
      ttlMinutes: generated.ttlMinutes,
    });

    return {
      challengeId: stored.id,
      method: stored.method,
      status: stored.status,
      dnsRecordName: generated.dnsRecordName,
      dnsRecordType: 'TXT',
      dnsRecordValue: generated.dnsRecordValue,
      expiresAt: stored.expiresAt,
    };
  }

  async function checkDnsChallenge({ organizationId, targetId, userId }) {
    await requireAdmin(organizationId, userId);
    const target = await targetVerificationRepository.getTarget(organizationId, targetId);

    if (!target) {
      throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
    }
    if (target.verification_state === 'verified') {
      return { status: 'verified', verified: true, alreadyVerified: true };
    }

    const challenge = await targetVerificationRepository.getPendingChallenge(organizationId, targetId);
    if (!challenge) {
      throw new HttpError(404, 'No pending verification challenge exists for this target.', 'VERIFICATION_CHALLENGE_NOT_FOUND');
    }

    let records = [];
    try {
      records = await resolveTxt(challenge.dnsRecordName);
    } catch (error) {
      if (!['ENODATA', 'ENOTFOUND'].includes(error?.code)) {
        throw new HttpError(
          502,
          'DNS verification lookup could not be completed.',
          'DNS_VERIFICATION_LOOKUP_FAILED',
        );
      }
    }

    const matched = txtRecordsMatchTokenHash(records, challenge.tokenHash);
    const updated = await targetVerificationRepository.recordAttempt({
      organizationId,
      targetId,
      challengeId: challenge.id,
      matched,
    });

    return {
      challengeId: updated.id,
      status: updated.status,
      verified: updated.status === 'verified',
      attemptCount: updated.attemptCount,
      expiresAt: updated.expiresAt,
      lastCheckedAt: updated.lastCheckedAt,
    };
  }

  return {
    checkDnsChallenge,
    startDnsChallenge,
  };
}

module.exports = { createTargetVerificationService };
