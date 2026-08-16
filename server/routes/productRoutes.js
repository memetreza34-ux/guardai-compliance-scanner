const express = require('express');
const { getProductPersistenceServices } = require('../services/productPersistenceExtensions');
const { evidenceRoutes } = require('./evidenceRoutes');
const { findingRoutes } = require('./findingRoutes');
const { ruleRoutes } = require('./ruleRoutes');

const router = express.Router();

// Initialize the product repositories/services once using the same canonical
// database pool and Organization authorization boundary as the core API.
getProductPersistenceServices();

router.use(ruleRoutes);
router.use(findingRoutes);
router.use(evidenceRoutes);

module.exports = { productRoutes: router };
