const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { HttpError } = require('../lib/httpError');
const { PROTOCOL_VERSION } = require('./parserSandboxServer');

const MAX_HEADER_BYTES = 4096;
const MAX_RESPONSE_OVERHEAD = 8192;

function normalizeRuntimeAttestation(attestation) {
  const requiredTrue = [
    'isolatedExecution',
    'networkDisabled',
    'ephemeralFilesystem',
    'resourceLimitsEnforced',
    'outputLimitEnforced',
    'noDirectStorageCredentials',
  ];
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    throw new TypeError('Parser runtime attestation is required.');
  }
  const missing = requiredTrue.filter((key) => attestation[key] !== true);
  if (missing.length > 0) {
    throw new TypeError(`Parser runtime attestation is missing: ${missing.join(', ')}`);
  }
  return Object.freeze(Object.fromEntries(requiredTrue.map((key) => [key, true])));
}

function connectParserSocket(socketPath, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new HttpError(503, 'Parser sandbox connection timed out.', 'ASSET_PARSER_PROVIDER_UNAVAILABLE'));
    }, timeoutMs);
    timer.unref?.();
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.setTimeout(timeoutMs, () => socket.destroy(new Error('parser timeout')));
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(new HttpError(503, `Parser sandbox socket is unavailable: ${error.code || 'socket_error'}.`, 'ASSET_PARSER_PROVIDER_UNAVAILABLE'));
    });
  });
}

async function writeSocket(socket, buffer) {
  if (socket.destroyed) throw new HttpError(503, 'Parser sandbox socket closed.', 'ASSET_PARSER_PROVIDER_UNAVAILABLE');
  if (!socket.write(buffer)) await once(socket, 'drain');
}

function readParserResponse(socket, maxExtractedTextChars, timeoutMs) {
  const maxResponseBytes = maxExtractedTextChars * 4 + MAX_RESPONSE_OVERHEAD + 4;
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let expected = null;
    let settled = false;
    const timer = setTimeout(() => fail(new HttpError(503, 'Parser sandbox response timed out.', 'ASSET_PARSER_PROVIDER_UNAVAILABLE')), timeoutMs);
    timer.unref?.();

    function cleanup() {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('end', onEnd);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    }
    function finish(payload) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    }
    function parseIfReady() {
      if (expected === null) {
        if (buffer.length < 4) return;
        expected = buffer.readUInt32BE(0);
        if (expected < 2 || expected > maxResponseBytes - 4) {
          fail(new HttpError(502, 'Parser sandbox response length is invalid.', 'ASSET_PARSER_RESULT_INVALID'));
          return;
        }
      }
      if (buffer.length < expected + 4) return;
      if (buffer.length !== expected + 4) {
        fail(new HttpError(502, 'Parser sandbox response contains trailing bytes.', 'ASSET_PARSER_RESULT_INVALID'));
        return;
      }
      try {
        finish(JSON.parse(buffer.subarray(4).toString('utf8')));
      } catch {
        fail(new HttpError(502, 'Parser sandbox response JSON is invalid.', 'ASSET_PARSER_RESULT_INVALID'));
      }
    }
    function onData(chunk) {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
      if (buffer.length > maxResponseBytes) {
        fail(new HttpError(422, 'Parser sandbox response exceeds GuardAI limits.', 'ASSET_PARSER_OUTPUT_LIMIT'));
        return;
      }
      parseIfReady();
    }
    function onEnd() {
      if (!settled) parseIfReady();
      if (!settled) fail(new HttpError(503, 'Parser sandbox closed before a complete response.', 'ASSET_PARSER_PROVIDER_UNAVAILABLE'));
    }
    function onError(error) {
      fail(new HttpError(503, `Parser sandbox socket failed: ${error.code || 'socket_error'}.`, 'ASSET_PARSER_PROVIDER_UNAVAILABLE'));
    }
    function onTimeout() {
      fail(new HttpError(503, 'Parser sandbox request timed out.', 'ASSET_PARSER_PROVIDER_UNAVAILABLE'));
    }

    socket.on('data', onData);
    socket.once('end', onEnd);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

function createUnixParserProvider({
  socketPath,
  parserId = 'guardai-pdf-text-parser',
  parserVersion = '0.1.0',
  runtimeAttestation,
  timeoutMs = 30000,
  maxBytes = 10 * 1024 * 1024,
  maxExtractedTextChars = 100000,
}) {
  if (typeof socketPath !== 'string' || !path.isAbsolute(socketPath) || socketPath.length > 500) {
    throw new TypeError('Parser provider requires an absolute Unix socket path.');
  }
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(parserId) || typeof parserVersion !== 'string' || parserVersion.length < 1 || parserVersion.length > 80) {
    throw new TypeError('Parser provider provenance is invalid.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new TypeError('Parser timeout is invalid.');
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 50 * 1024 * 1024) throw new TypeError('Parser byte limit is invalid.');
  if (!Number.isInteger(maxExtractedTextChars) || maxExtractedTextChars < 1000 || maxExtractedTextChars > 1000000) throw new TypeError('Parser output limit is invalid.');
  const controls = normalizeRuntimeAttestation(runtimeAttestation);

  return Object.freeze({
    getSafetyAttestation() {
      return { parserId, parserVersion, ...controls };
    },

    async parseStream({
      contentStream,
      mediaType,
      expectedSha256,
      byteLength,
      maxBytes: taskMaxBytes,
      maxExtractedTextChars: taskMaxChars,
      timeoutSeconds,
    }) {
      if (!contentStream || typeof contentStream[Symbol.asyncIterator] !== 'function') {
        throw new HttpError(502, 'Parser provider requires a readable content stream.', 'ASSET_PARSER_RESULT_INVALID');
      }
      const effectiveBytes = Math.min(maxBytes, Number.isInteger(taskMaxBytes) ? taskMaxBytes : maxBytes);
      const effectiveChars = Math.min(maxExtractedTextChars, Number.isInteger(taskMaxChars) ? taskMaxChars : maxExtractedTextChars);
      const effectiveTimeout = Math.min(timeoutMs, Number.isInteger(timeoutSeconds) ? timeoutSeconds * 1000 : timeoutMs);
      if (!['application/pdf', 'text/plain'].includes(mediaType)) throw new HttpError(415, 'Parser media type is unsupported.', 'ASSET_MEDIA_TYPE_MISMATCH');
      if (!/^[a-f0-9]{64}$/.test(String(expectedSha256 || ''))) throw new HttpError(500, 'Parser expected SHA-256 is invalid.', 'ASSET_PARSER_INPUT_HASH_MISMATCH');
      if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > effectiveBytes) throw new HttpError(413, 'Parser input exceeds GuardAI limits.', 'ASSET_UPLOAD_SIZE_EXCEEDED');

      const header = Buffer.from(JSON.stringify({
        version: PROTOCOL_VERSION,
        mediaType,
        byteLength,
        expectedSha256,
        maxExtractedTextChars: effectiveChars,
      }), 'utf8');
      if (header.length > MAX_HEADER_BYTES) throw new HttpError(500, 'Parser request header exceeds GuardAI limits.', 'ASSET_PARSER_PROTOCOL_INVALID');
      const prefix = Buffer.allocUnsafe(4);
      prefix.writeUInt32BE(header.length, 0);

      const socket = await connectParserSocket(socketPath, effectiveTimeout);
      const responsePromise = readParserResponse(socket, effectiveChars, effectiveTimeout);
      const hash = crypto.createHash('sha256');
      let sent = 0;
      try {
        await writeSocket(socket, prefix);
        await writeSocket(socket, header);
        for await (const value of contentStream) {
          const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
          sent += chunk.length;
          if (sent > byteLength || sent > effectiveBytes) {
            socket.destroy();
            throw new HttpError(413, 'Parser stream exceeded the verified Asset length.', 'ASSET_UPLOAD_SIZE_EXCEEDED');
          }
          hash.update(chunk);
          await writeSocket(socket, chunk);
        }
        if (sent !== byteLength) {
          socket.destroy();
          throw new HttpError(422, 'Parser stream length changed after Asset verification.', 'ASSET_UPLOAD_SIZE_MISMATCH');
        }
        if (hash.digest('hex') !== expectedSha256) {
          socket.destroy();
          throw new HttpError(422, 'Parser stream SHA-256 changed after Asset verification.', 'ASSET_PARSER_INPUT_HASH_MISMATCH');
        }
        socket.end();
        const response = await responsePromise;
        if (!response || typeof response !== 'object' || Array.isArray(response)) {
          throw new HttpError(502, 'Parser sandbox returned an invalid response.', 'ASSET_PARSER_RESULT_INVALID');
        }
        if (response.ok !== true) {
          const code = typeof response.code === 'string' && /^[A-Z0-9_:-]{1,100}$/.test(response.code)
            ? response.code
            : 'ASSET_PARSER_EXECUTION_FAILED';
          const status = code === 'ASSET_PARSER_EXECUTION_FAILED' ? 502 : 422;
          throw new HttpError(status, String(response.message || 'Parser sandbox rejected the Asset.').slice(0, 500), code);
        }
        if (response.parserId !== parserId || response.parserVersion !== parserVersion) {
          throw new HttpError(502, 'Parser sandbox provenance does not match configured provider.', 'ASSET_PARSER_RESULT_INVALID');
        }
        if (typeof response.text !== 'string' || response.text.length > effectiveChars) {
          throw new HttpError(422, 'Parser sandbox text exceeds GuardAI limits.', 'ASSET_PARSER_OUTPUT_LIMIT');
        }
        return {
          text: response.text,
          pageCount: Number.isInteger(response.pageCount) && response.pageCount >= 0 ? response.pageCount : null,
        };
      } finally {
        socket.destroy();
      }
    },
  });
}

module.exports = {
  createUnixParserProvider,
  normalizeRuntimeAttestation,
  readParserResponse,
};
