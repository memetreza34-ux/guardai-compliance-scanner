const fs = require('node:fs');
const express = require('express');
const { HttpError } = require('../lib/httpError');
const { createPrototypeAccessPolicy } = require('../lib/prototypeAccess');
const { finalizeScanResponse } = require('../lib/scanContract');
const { normalizeHttpUrl } = require('../lib/targetSafety');
const { scanLimiter } = require('../middleware/scanLimiter');
const { upload } = require('../middleware/upload');
const { sendRouteError } = require('../middleware/errorHandler');
const { extractFileText, scanFileText, verifyUploadedFile } = require('../scanners/fileScanner');
const { resolveWebScanOptions, scanSchema } = require('../scanners/schemas');
const { scanWebsite } = require('../scanners/webScanner');

const router = express.Router();
const prototypeAccess = createPrototypeAccessPolicy();

router.post('/scan', scanLimiter, async (req, res) => {
  try {
    prototypeAccess.assertEnabled();
    const validated = scanSchema.parse(req.body);
    const targetUrl = normalizeHttpUrl(validated.url);
    const options = resolveWebScanOptions(validated.options);

    if (targetUrl.hostname.toLowerCase() === 'github.com') {
      throw new HttpError(
        501,
        'GitHub repository scanning is temporarily disabled while the real dependency, secret and SAST pipeline is rebuilt.',
        'REPOSITORY_SCANNER_NOT_AVAILABLE',
      );
    }

    const scanResult = await scanWebsite(targetUrl.toString(), options);
    res.json(finalizeScanResponse(scanResult));
  } catch (error) {
    sendRouteError(res, error, 'Scan API');
  }
});

router.post('/scan-file', scanLimiter, async (req, res, next) => {
  try {
    prototypeAccess.assertEnabled();
    upload.single('file')(req, res, next);
  } catch (error) {
    next(error);
  }
}, async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      throw new HttpError(400, 'No file uploaded.', 'FILE_REQUIRED');
    }

    filePath = req.file.path;
    const buffer = await fs.promises.readFile(filePath);
    const fileType = verifyUploadedFile(buffer, req.file);
    const extractedText = await extractFileText(buffer, fileType);
    const result = await scanFileText(req.file.originalname, extractedText);

    res.json(finalizeScanResponse(result));
  } catch (error) {
    sendRouteError(res, error, 'File Scan API');
  } finally {
    if (filePath) {
      fs.promises.unlink(filePath).catch((error) => {
        console.error('[File Scan API] Temporary file cleanup failed:', error.message);
      });
    }
  }
});

module.exports = { scanRoutes: router };
