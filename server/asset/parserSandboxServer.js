const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { parseAssetBuffer } = require('./parserSandboxEngine');

const PROTOCOL_VERSION = 1;
const MAX_HEADER_BYTES = 4096;
const MAX_RESPONSE_OVERHEAD = 8192;

function safeParserError(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_:-]{1,100}$/.test(error.code)
    ? error.code
    : 'ASSET_PARSER_EXECUTION_FAILED';
  const message = error instanceof Error
    ? error.message.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 500)
    : 'Asset parser execution failed.';
  return { ok: false, code, message: message || 'Asset parser execution failed.' };
}

function validateRequestHeader(header, maxBytes, maxExtractedTextChars) {
  if (!header || typeof header !== 'object' || Array.isArray(header) || header.version !== PROTOCOL_VERSION) {
    throw Object.assign(new Error('Parser sandbox protocol header is invalid.'), { code: 'ASSET_PARSER_PROTOCOL_INVALID' });
  }
  if (!['application/pdf', 'text/plain'].includes(header.mediaType)) {
    throw Object.assign(new Error('Parser sandbox media type is invalid.'), { code: 'ASSET_MEDIA_TYPE_MISMATCH' });
  }
  if (!Number.isInteger(header.byteLength) || header.byteLength < 1 || header.byteLength > maxBytes) {
    throw Object.assign(new Error('Parser sandbox byte length is invalid.'), { code: 'ASSET_UPLOAD_SIZE_EXCEEDED' });
  }
  if (typeof header.expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(header.expectedSha256)) {
    throw Object.assign(new Error('Parser sandbox SHA-256 is invalid.'), { code: 'ASSET_PARSER_INPUT_HASH_MISMATCH' });
  }
  if (
    !Number.isInteger(header.maxExtractedTextChars) ||
    header.maxExtractedTextChars < 1 ||
    header.maxExtractedTextChars > maxExtractedTextChars
  ) {
    throw Object.assign(new Error('Parser sandbox output bound is invalid.'), { code: 'ASSET_PARSER_OUTPUT_LIMIT' });
  }
  return header;
}

function encodeResponse(payload, maxExtractedTextChars) {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  if (json.length > maxExtractedTextChars * 4 + MAX_RESPONSE_OVERHEAD) {
    return encodeResponse({
      ok: false,
      code: 'ASSET_PARSER_OUTPUT_LIMIT',
      message: 'Parser sandbox response exceeds GuardAI limits.',
    }, 1000);
  }
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(json.length, 0);
  return Buffer.concat([prefix, json]);
}

function createParserSandboxServer({
  socketPath,
  parserId = 'guardai-pdf-text-parser',
  parserVersion = '0.1.0',
  maxBytes = 10 * 1024 * 1024,
  maxExtractedTextChars = 100000,
}) {
  if (typeof socketPath !== 'string' || !path.isAbsolute(socketPath) || socketPath.length > 500) {
    throw new TypeError('Parser sandbox requires an absolute Unix socket path.');
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 50 * 1024 * 1024) {
    throw new TypeError('Parser sandbox byte limit is invalid.');
  }
  if (!Number.isInteger(maxExtractedTextChars) || maxExtractedTextChars < 1000 || maxExtractedTextChars > 1000000) {
    throw new TypeError('Parser sandbox output limit is invalid.');
  }

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let header = null;
    let expectedTotal = null;
    let processing = false;

    async function processIfReady() {
      if (processing) return;
      try {
        if (!header) {
          if (buffer.length < 4) return;
          const headerLength = buffer.readUInt32BE(0);
          if (headerLength < 2 || headerLength > MAX_HEADER_BYTES) {
            throw Object.assign(new Error('Parser sandbox header length is invalid.'), { code: 'ASSET_PARSER_PROTOCOL_INVALID' });
          }
          if (buffer.length < 4 + headerLength) return;
          let parsed;
          try {
            parsed = JSON.parse(buffer.subarray(4, 4 + headerLength).toString('utf8'));
          } catch {
            throw Object.assign(new Error('Parser sandbox header JSON is invalid.'), { code: 'ASSET_PARSER_PROTOCOL_INVALID' });
          }
          header = validateRequestHeader(parsed, maxBytes, maxExtractedTextChars);
          expectedTotal = 4 + headerLength + header.byteLength;
        }

        if (buffer.length > expectedTotal) {
          throw Object.assign(new Error('Parser sandbox received trailing bytes.'), { code: 'ASSET_PARSER_PROTOCOL_INVALID' });
        }
        if (buffer.length < expectedTotal) return;

        processing = true;
        const headerLength = buffer.readUInt32BE(0);
        const asset = Buffer.from(buffer.subarray(4 + headerLength, expectedTotal));
        const result = await parseAssetBuffer({
          buffer: asset,
          mediaType: header.mediaType,
          expectedSha256: header.expectedSha256,
          maxBytes,
          maxExtractedTextChars: header.maxExtractedTextChars,
        });
        socket.end(encodeResponse({
          ok: true,
          parserId,
          parserVersion,
          text: result.text,
          pageCount: result.pageCount,
        }, maxExtractedTextChars));
      } catch (error) {
        processing = true;
        socket.end(encodeResponse(safeParserError(error), maxExtractedTextChars));
      }
    }

    socket.on('data', (chunk) => {
      if (processing) return;
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
      if (buffer.length > maxBytes + MAX_HEADER_BYTES + 4) {
        processing = true;
        socket.end(encodeResponse({
          ok: false,
          code: 'ASSET_UPLOAD_SIZE_EXCEEDED',
          message: 'Parser sandbox request exceeds GuardAI limits.',
        }, maxExtractedTextChars));
        return;
      }
      processIfReady();
    });
    socket.on('error', () => {});
  });

  return {
    parserId,
    parserVersion,
    socketPath,
    server,
    async start() {
      if (process.platform === 'win32') throw new Error('GuardAI parser sandbox Unix socket service requires a Unix-like runtime.');
      try { fs.rmSync(socketPath, { force: true }); } catch {}
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(socketPath, resolve);
      });
      try { fs.chmodSync(socketPath, 0o660); } catch {}
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      try { fs.rmSync(socketPath, { force: true }); } catch {}
    },
  };
}

module.exports = {
  createParserSandboxServer,
  encodeResponse,
  PROTOCOL_VERSION,
  safeParserError,
  validateRequestHeader,
};
