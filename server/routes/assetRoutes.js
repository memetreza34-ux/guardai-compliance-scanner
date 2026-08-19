const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const uploadParamsSchema = z.object({
  organizationId: z.string().uuid(),
  uploadId: z.string().uuid(),
});
const createUploadSchema = z.object({
  fileName: z.string().min(1).max(500),
  mediaType: z.enum(['application/pdf', 'text/plain']),
  byteLength: z.number().int().positive().max(50 * 1024 * 1024),
}).strict();
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

router.post('/organizations/:organizationId/assets/upload-sessions', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = createUploadSchema.parse(req.body);
    const { assetUploadService } = getPersistenceServices();
    const result = await assetUploadService.createUploadSession({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      input: body,
    });
    res.status(201).json(result);
  } catch (error) {
    sendRouteError(res, error, 'Asset Upload Session');
  }
});

router.post('/organizations/:organizationId/assets/uploads/:uploadId/finalize', requireAuth, async (req, res) => {
  try {
    const params = uploadParamsSchema.parse(req.params);
    const { assetUploadService } = getPersistenceServices();
    const result = await assetUploadService.finalizeUpload({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      uploadId: params.uploadId,
    });
    res.status(202).json(result);
  } catch (error) {
    sendRouteError(res, error, 'Asset Upload Finalize');
  }
});

router.get('/organizations/:organizationId/assets/uploads', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);
    const { assetUploadService } = getPersistenceServices();
    res.json({
      uploads: await assetUploadService.listUploads({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        limit: query.limit,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Asset Upload List');
  }
});

router.get('/organizations/:organizationId/assets/uploads/:uploadId', requireAuth, async (req, res) => {
  try {
    const params = uploadParamsSchema.parse(req.params);
    const { assetUploadService } = getPersistenceServices();
    res.json({
      upload: await assetUploadService.getUpload({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        uploadId: params.uploadId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Asset Upload Read');
  }
});

module.exports = { assetRoutes: router };
