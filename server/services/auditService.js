function createAuditService({ auditRepository, organizationAuthorization }) {
  if (!auditRepository || typeof auditRepository.listAuditEvents !== 'function') {
    throw new TypeError('Audit service requires an audit repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Audit service requires organization authorization.');
  }

  async function list({ organizationId, userId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    return auditRepository.listAuditEvents({ organizationId, limit, cursor });
  }

  return { list };
}

module.exports = { createAuditService };
