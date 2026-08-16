const { HttpError } = require('../lib/httpError');

function assertTargetVerified(target) {
  if (!target || target.verification_state !== 'verified') {
    throw new HttpError(
      403,
      'Target must be verified before GuardAI can run persistent scans against it.',
      'TARGET_NOT_VERIFIED',
    );
  }
}

module.exports = { assertTargetVerified };
