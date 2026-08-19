const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const { PDFParse } = require('pdf-parse');
const { detectAssetMediaType } = require('../domain/assetUpload');
const { HttpError } = require('../lib/httpError');

async function parsePdf(buffer, maxExtractedTextChars) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (!result || typeof result.text !== 'string') {
      throw new HttpError(422, 'PDF parser returned no text result.', 'ASSET_PARSER_RESULT_INVALID');
    }
    if (result.text.length > maxExtractedTextChars) {
      throw new HttpError(422, 'PDF extracted text exceeds GuardAI limits.', 'ASSET_PARSER_OUTPUT_LIMIT');
    }
    return {
      text: result.text,
      pageCount: Number.isInteger(result.total) && result.total >= 0 ? result.total : null,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function parsePlainText(buffer, maxExtractedTextChars) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new HttpError(415, 'Text asset is not valid UTF-8.', 'ASSET_TEXT_ENCODING_INVALID');
  }
  if (text.length > maxExtractedTextChars) {
    throw new HttpError(422, 'Text asset exceeds GuardAI extracted-text limits.', 'ASSET_PARSER_OUTPUT_LIMIT');
  }
  return { text, pageCount: null };
}

async function parseAssetBuffer({ buffer, mediaType, expectedSha256, maxBytes, maxExtractedTextChars }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1) {
    throw new HttpError(422, 'Parser sandbox received an empty Asset.', 'ASSET_UPLOAD_EMPTY');
  }
  if (!Number.isInteger(maxBytes) || buffer.length > maxBytes) {
    throw new HttpError(413, 'Parser sandbox Asset exceeds GuardAI limits.', 'ASSET_UPLOAD_SIZE_EXCEEDED');
  }
  if (!Number.isInteger(maxExtractedTextChars) || maxExtractedTextChars < 1) {
    throw new TypeError('Parser sandbox requires a positive output bound.');
  }
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== expectedSha256) {
    throw new HttpError(422, 'Parser sandbox bytes do not match verified Asset SHA-256.', 'ASSET_PARSER_INPUT_HASH_MISMATCH');
  }
  const detected = detectAssetMediaType(buffer.subarray(0, Math.min(buffer.length, 8192)));
  if (detected !== mediaType) {
    throw new HttpError(415, 'Parser sandbox content type does not match verified Asset type.', 'ASSET_MEDIA_TYPE_MISMATCH');
  }

  if (mediaType === 'application/pdf') {
    return parsePdf(buffer, maxExtractedTextChars);
  }
  if (mediaType === 'text/plain') {
    return parsePlainText(buffer, maxExtractedTextChars);
  }
  throw new HttpError(415, 'Parser sandbox media type is unsupported.', 'ASSET_MEDIA_TYPE_MISMATCH');
}

module.exports = {
  parseAssetBuffer,
  parsePdf,
  parsePlainText,
};
