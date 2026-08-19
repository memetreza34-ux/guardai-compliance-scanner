const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { Readable } = require('node:stream');
const {
  createClamdStreamScanner,
  parseClamdScanReply,
  parseClamdVersionReply,
} = require('../asset/clamdStreamScanner');

function versionInfo() {
  return { engineVersion: '1.4.2', signatureVersion: '27381', signatureDate: 'Wed Aug 19 2026' };
}

test('ClamAV VERSION and scan replies are parsed fail-closed', () => {
  assert.deepEqual(
    parseClamdVersionReply('ClamAV 1.4.2/27381/Wed Aug 19 2026\0'),
    versionInfo(),
  );
  assert.deepEqual(
    parseClamdScanReply('stream: OK\0', versionInfo()),
    { verdict: 'clean', signatureVersion: '27381' },
  );
  const infected = parseClamdScanReply('stream: Eicar-Signature FOUND\0', versionInfo());
  assert.equal(infected.verdict, 'infected');
  assert.equal(infected.detectionName, 'Eicar-Signature');
  assert.throws(
    () => parseClamdScanReply('stream: scan failed ERROR\0', versionInfo()),
    (error) => error.code === 'ASSET_MALWARE_PROVIDER_UNAVAILABLE',
  );
  assert.throws(
    () => parseClamdScanReply('garbage', versionInfo()),
    (error) => error.code === 'ASSET_MALWARE_RESULT_INVALID',
  );
});

test('ClamAV provider streams exact verified bytes with INSTREAM framing over Unix socket', { skip: process.platform === 'win32' }, async () => {
  const socketPath = path.join(os.tmpdir(), `guardai-clamd-${process.pid}-${Date.now()}.sock`);
  await fs.rm(socketPath, { force: true });
  const expected = Buffer.from('GuardAI exact stream bytes', 'utf8');
  let scanned = null;

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.subarray(0, 9).toString('binary') === 'zVERSION\0') {
        socket.end(Buffer.from('ClamAV 1.4.2/27381/Wed Aug 19 2026\0', 'utf8'));
        return;
      }
      const command = Buffer.from('zINSTREAM\0', 'binary');
      if (buffer.length < command.length || !buffer.subarray(0, command.length).equals(command)) return;

      let offset = command.length;
      const parts = [];
      while (offset + 4 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        if (offset + 4 + length > buffer.length) return;
        offset += 4;
        if (length === 0) {
          scanned = Buffer.concat(parts);
          socket.end(Buffer.from('stream: OK\0', 'utf8'));
          return;
        }
        parts.push(buffer.subarray(offset, offset + length));
        offset += length;
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });

  try {
    const scanner = createClamdStreamScanner({
      socketPath,
      engineVersion: '1.4.2',
      startupSignatureVersion: '27381',
      timeoutMs: 5000,
      maxBytes: 1024 * 1024,
    });
    const result = await scanner.scanStream({
      contentStream: Readable.from([expected.subarray(0, 7), expected.subarray(7)]),
      byteLength: expected.length,
      maxBytes: 1024 * 1024,
    });
    assert.equal(result.verdict, 'clean');
    assert.equal(result.signatureVersion, '27381');
    assert.deepEqual(scanned, expected);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(socketPath, { force: true });
  }
});

test('ClamAV provider rejects a stream whose bytes change after GuardAI verification', { skip: process.platform === 'win32' }, async () => {
  const socketPath = path.join(os.tmpdir(), `guardai-clamd-size-${process.pid}-${Date.now()}.sock`);
  await fs.rm(socketPath, { force: true });
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.subarray(0, 9).toString('binary') === 'zVERSION\0') {
        socket.end(Buffer.from('ClamAV 1.4.2/27381/Wed Aug 19 2026\0', 'utf8'));
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });

  try {
    const scanner = createClamdStreamScanner({
      socketPath,
      engineVersion: '1.4.2',
      startupSignatureVersion: '27381',
      timeoutMs: 5000,
      maxBytes: 1024,
    });
    await assert.rejects(
      () => scanner.scanStream({
        contentStream: Readable.from([Buffer.from('four')]),
        byteLength: 3,
        maxBytes: 1024,
      }),
      (error) => error.code === 'ASSET_UPLOAD_SIZE_EXCEEDED',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(socketPath, { force: true });
  }
});
