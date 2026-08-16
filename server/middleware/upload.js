const path = require('node:path');
const multer = require('multer');
const { config } = require('../config');
const { HttpError } = require('../lib/httpError');
const { scanAccess } = require('../runtime');

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    try {
      scanAccess.assertFileAiAllowed();
    } catch (error) {
      callback(error);
      return;
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const allowed =
      (file.mimetype === 'application/pdf' && extension === '.pdf') ||
      (file.mimetype === 'text/plain' && extension === '.txt');

    if (!allowed) {
      callback(new HttpError(415, 'Only PDF and TXT uploads are currently supported.'));
      return;
    }

    callback(null, true);
  },
});

module.exports = { upload };
