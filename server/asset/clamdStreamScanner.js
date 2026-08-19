const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { HttpError } = require('../lib/httpError');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_REPLY_BYTES = 8192;
const MAX_CHUNK_BYTES = 1024 * 1024;

function normalizeSocketPath(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 500 || !path.isAbsolute(value)) {
    throw new TypeError('ClamAV LocalSocket path must be an absolute bounded path.');
  }
  if (value.includes('\0')) throw new TypeError('ClamAV LocalSocket path is invalid.');
  return value;
}

function normalizeTimeout(value = DEFAULT_TIMEOUT_MS) {
  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw new TypeError('ClamAV timeout is outside GuardAI bounds.');
  }
  return timeoutMs;
}

function parseClamdVersionReply(value) {
  const reply = String(value || '').replace(/\0/g, '').trim();
  const match = /^ClamAV\s+([^/\s]+)\/([^/\s]+)\/(.+)$/i.exec(reply);
  if (!match) {
    throw new HttpError(503, 'ClamAV VERSION response is invalid.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE');
  }
  return Object.freeze({
    engineVersion: match[1].slice(0, 80),
    signatureVersion: match[2].slice(0, 120),
    signatureDate: match[3].slice(0, 160),
  });
}

function parseClamdScanReply(value, versionInfo) {
  const reply = String(value || '').replace(/\0/g, '').trim();
  if (/^stream:\s+OK$/i.test(reply)) {
    return Object.freeze({ verdict: 'clean', signatureVersion: versionInfo.signatureVersion });
  }
  const found = /^stream:\s+(.+)\s+FOUND$/i.exec(reply);
  if (found) {
    return Object.freeze({
      verdict: 'infected',
      signatureVersion: versionInfo.signatureVersion,
      // Detection names are bounded engine metadata; never file contents.
      detectionName: found[1].slice(0, 200),
    });
  }
  if (/\sERROR$/i.test(reply) || /size limit exceeded/i.test(reply)) {
    throw new HttpError(503, 'ClamAV could not complete the malware scan.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE');
  }
  throw new HttpError(502, 'ClamAV scan response is invalid.', 'ASSET_MALWARE_RESULT_INVALID');
}

async function writeSocket(socket, buffer) {
  if (socket.destroyed) {
    throw new HttpError(503, 'ClamAV socket closed during scan.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE');
  }
  if (!socket.write(buffer)) await once(socket, 'drain');
}

function connectUnixSocket(socketPath, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new HttpError(503, 'ClamAV connection timed out.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE'));
    }, timeoutMs);
    timer.unref?.();

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.setTimeout(timeoutMs, () => socket.destroy(new Error('clamd timeout')));
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(new HttpError(503, `ClamAV LocalSocket is unavailable: ${error.code || 'socket_error'}.`, 'ASSET_MALWARE_PROVIDER_UNAVAILABLE'));
    });
  });
}

function readBoundedReply(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    const timer = setTimeout(() => finishReject(new HttpError(503, 'ClamAV reply timed out.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE')), timeoutMs);
    timer.unref?.();

    function cleanup() {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('end', onEnd);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    }
    function finishResolve(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }
    function finishReject(error) {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    }
    function onData(chunk) {
      const buffer = Buffer.from(chunk);
      total += buffer.length;
      if (total > MAX_REPLY_BYTES) {
        finishReject(new HttpError(502, 'ClamAV reply exceeded GuardAI limits.', 'ASSET_MALWARE_RESULT_INVALID'));
        return;
      }
      chunks.push(buffer);
      const combined = Buffer.concat(chunks);
      const terminator = combined.indexOf(0);
      if (terminator !== -1) finishResolve(combined.subarray(0, terminator).toString('utf8'));
    }
    function onEnd() {
      const combined = Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim();
      if (combined) finishResolve(combined);
      else finishReject(new HttpError(503, 'ClamAV closed without a reply.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE'));
    }
    function onError(error) {
      finishReject(new HttpError(503, `ClamAV socket failed: ${error.code || 'socket_error'}.`, 'ASSET_MALWARE_PROVIDER_UNAVAILABLE'));
    }
    function onTimeout() {
      finishReject(new HttpError(503, 'ClamAV scan timed out.', 'ASSET_MALWARE_PROVIDER_UNAVAILABLE'));
    }

    socket.on('data', onData);
    socket.once('end', onEnd);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

async function sendSimpleCommand(socketPath, command, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const normalizedPath = normalizeSocketPath(socketPath);
  const normalizedTimeout = normalizeTimeout(timeoutMs);
  if (!/^[A-Z]+$/.test(command)) throw new TypeError('ClamAV command is invalid.');
  const socket = await connectUnixSocket(normalizedPath, normalizedTimeout);
  try {
    const replyPromise = readBoundedReply(socket, normalizedTimeout);
    await writeSocket(socket, Buffer.from(`z${command}\0`, 'ascii'));
    return await replyPromise;
  } finally {
    socket.destroy();
  }
}

async function probeClamd({ socketPath, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const reply = await sendSimpleCommand(socketPath, 'VERSION', timeoutMs);
  return parseClamdVersionReply(reply);
}

function createClamdStreamScanner({
  socketPath,
  engineVersion,
  startupSignatureVersion,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
}) {
  const normalizedPath = normalizeSocketPath(socketPath);
  const normalizedTimeout = normalizeTimeout(timeoutMs);
  if (typeof engineVersion !== 'string' || engineVersion.length < 1 || engineVersion.length > 80) {
    throw new TypeError('ClamAV engine version must be established during boot probe.');
  }
  if (typeof startupSignatureVersion !== 'string' || startupSignatureVersion.length < 1 || startupSignatureVersion.length > 120) {
    throw new TypeError('ClamAV signature version must be established during boot probe.');
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 50 * 1024 * 1024) {
    throw new TypeError('ClamAV stream byte limit is outside GuardAI bounds.');
  }

  return Object.freeze({
    getSafetyAttestation() {
      return {
        engineId: 'clamav-clamd-instream',
        engineVersion,
        isolatedExecution: true,
        failClosedOnScannerError: true,
        signatureVersionReported: true,
        noPublicArtifactAccess: true,
        noDirectStorageCredentials: true,
      };
    },

    async scanStream({ contentStream, byteLength, maxBytes: taskMaxBytes }) {
      if (!contentStream || typeof contentStream[Symbol.asyncIterator] !== 'function') {
        throw new HttpError(502, 'ClamAV scan requires a readable content stream.', 'ASSET_MALWARE_RESULT_INVALID');
      }
      const effectiveMax = Math.min(maxBytes, Number.isInteger(taskMaxBytes) ? taskMaxBytes : maxBytes);
      if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > effectiveMax) {
        throw new HttpError(413, 'Asset exceeds ClamAV stream limits.', 'ASSET_UPLOAD_SIZE_EXCEEDED');
      }

      // Re-probe VERSION for each task so the persisted signature version reflects the
      // daemon currently performing the scan, not only process startup state.
      const currentVersion = await probeClamd({ socketPath: normalizedPath, timeoutMs: normalizedTimeout });
      const socket = await connectUnixSocket(normalizedPath, normalizedTimeout);
      let sent = 0;
      try {
        const replyPromise = readBoundedReply(socket, normalizedTimeout);
        await writeSocket(socket, Buffer.from('zINSTREAM\0', 'ascii'));
        for await (const value of contentStream) {
          const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
          sent += chunk.length;
          if (sent > effectiveMax || sent > byteLength) {
            socket.destroy();
            throw new HttpError(413, 'Asset stream exceeded the verified byte length.', 'ASSET_UPLOAD_SIZE_EXCEEDED');
          }
          for (let offset = 0; offset < chunk.length; offset += MAX_CHUNK_BYTES) {
            const part = chunk.subarray(offset, Math.min(chunk.length, offset + MAX_CHUNK_BYTES));
            const prefix = Buffer.allocUnsafe(4);
            prefix.writeUInt32BE(part.length, 0);
            await writeSocket(socket, prefix);
            await writeSocket(socket, part);
          }
        }
        if (sent !== byteLength) {
          socket.destroy();
          throw new HttpError(422, 'Asset stream length changed before malware scanning.', 'ASSET_UPLOAD_SIZE_MISMATCH');
        }
        await writeSocket(socket, Buffer.alloc(4));
        const reply = await replyPromise;
        return parseClamdScanReply(reply, currentVersion);
      } catch (error) {
        socket.destroy();
        throw error;
      } finally {
        socket.destroy();
      }
    },

    startupSignatureVersion,
  });
}

module.exports = {
  createClamdStreamScanner,
  parseClamdScanReply,
  parseClamdVersionReply,
  probeClamd,
  sendSimpleCommand,
};
