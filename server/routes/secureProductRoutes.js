const express = require('express');
const { getSecureProductPersistenceServices } = require('../services/secureProductPersistenceExtensions');
const { evidenceRoutes } = require('./evidenceRoutes');
const { findingRoutes } = require('./findingRoutes');
const { ruleRoutes } = require('./ruleRoutes');

const router = express.Router();

getSecureProductPersistenceServices();

router.use(ruleRoutes);
router.use(findingRoutes);
router.use(evidenceRoutes);

module.exports = { secureProductRoutes: router };
