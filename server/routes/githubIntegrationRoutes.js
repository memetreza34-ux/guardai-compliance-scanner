const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getGitHubIntegrationPersistenceServices } = require('../services/githubIntegrationPersistence');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const completeSchema = z.object({
  state: z.string().min(20).max(200),
  installationId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
}).strict();

router.get('/organizations/:organizationId/integrations/github', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { githubIntegrationService } = getGitHubIntegrationPersistenceServices();
    res.json({
      integration: await githubIntegrationService.getStatus({
        organizationId: params.organizationId,
        userId: req.auth.userId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'GitHub Integration Status');
  }
});

router.post('/organizations/:organizationId/integrations/github/install-session', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { githubIntegrationService } = getGitHubIntegrationPersistenceServices();
    const session = await githubIntegrationService.startInstallation({
      organizationId: params.organizationId,
      userId: req.auth.userId,
    });
    res.status(201).json({ installation: session });
  } catch (error) {
    sendRouteError(res, error, 'GitHub Installation Start');
  }
});

router.get('/organizations/:organizationId/integrations/github/repositories', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { githubIntegrationService } = getGitHubIntegrationPersistenceServices();
    res.json({
      repositories: await githubIntegrationService.listRepositories({
        organizationId: params.organizationId,
        userId: req.auth.userId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'GitHub Repository List');
  }
});

router.post('/public/integrations/github/complete', async (req, res) => {
  try {
    const body = completeSchema.parse(req.body);
    const { githubIntegrationService } = getGitHubIntegrationPersistenceServices();
    const installation = await githubIntegrationService.completeInstallation({
      stateToken: body.state,
      installationId: body.installationId,
    });
    res.json({
      integration: {
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        repositorySelection: installation.repositorySelection,
        status: installation.status,
      },
    });
  } catch (error) {
    sendRouteError(res, error, 'GitHub Installation Complete');
  }
});

async function githubWebhookHandler(req, res) {
  try {
    const { githubIntegrationService } = getGitHubIntegrationPersistenceServices();
    const result = await githubIntegrationService.processWebhook({
      rawBody: req.body,
      signatureHeader: req.get('x-hub-signature-256'),
      deliveryId: req.get('x-github-delivery'),
      eventType: req.get('x-github-event'),
    });
    res.json({ received: true, ...result });
  } catch (error) {
    sendRouteError(res, error, 'GitHub Webhook');
  }
}

module.exports = {
  githubIntegrationRoutes: router,
  githubWebhookHandler,
};
