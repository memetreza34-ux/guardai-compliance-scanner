const { getPostgresPool } = require('../database/postgres');
const { createLeadRepository } = require('../repositories/leadRepository');
const { createLeadCaptureService } = require('./leadCaptureService');

let leadServices = null;

function createLeadPersistenceServices() {
  const pool = getPostgresPool();
  const leadRepository = createLeadRepository(pool);
  const leadCaptureService = createLeadCaptureService({ leadRepository });
  return { leadCaptureService, leadRepository };
}

function getLeadPersistenceServices() {
  if (!leadServices) leadServices = createLeadPersistenceServices();
  return leadServices;
}

module.exports = {
  createLeadPersistenceServices,
  getLeadPersistenceServices,
};
