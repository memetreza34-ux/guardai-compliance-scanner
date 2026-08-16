const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertPublicHttpTarget,
  createSafeLookup,
  isBlockedIp,
  normalizeHttpUrl,
} = require('../lib/targetSafety');

function assertHttpError(fn, expectedMessagePart) {
  assert.throws(fn, (error) => {
    assert.equal(error.name, 'HttpError');
    assert.match(error.message, new RegExp(expectedMessagePart, 'i'));
    return true;
  });
}

function runLookup(lookup, hostname, options = {}) {
  return new Promise((resolve, reject) => {
    lookup(hostname, options, (error, address, family) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ address, family });
    });
  });
}

test('normalizeHttpUrl adds https to bare domains', () => {
  assert.equal(normalizeHttpUrl('example.com').toString(), 'https://example.com/');
});

test('normalizeHttpUrl rejects credentials', () => {
  assertHttpError(
    () => normalizeHttpUrl('https://user:password@example.com'),
    'credentials',
  );
});

test('normalizeHttpUrl rejects non-standard ports', () => {
  assertHttpError(
    () => normalizeHttpUrl('https://example.com:8080'),
    'standard HTTP/HTTPS ports',
  );
});

test('normalizeHttpUrl rejects non-http protocols', () => {
  assertHttpError(
    () => normalizeHttpUrl('ftp://example.com/file'),
    'HTTP or HTTPS',
  );
});

test('isBlockedIp rejects private, loopback, link-local and reserved IPv4 ranges', () => {
  const blocked = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '192.0.2.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
  ];

  for (const address of blocked) {
    assert.equal(isBlockedIp(address), true, address);
  }

  assert.equal(isBlockedIp('8.8.8.8'), false);
});

test('isBlockedIp rejects private IPv6 ranges and IPv4-mapped loopback', () => {
  const blocked = [
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
  ];

  for (const address of blocked) {
    assert.equal(isBlockedIp(address), true, address);
  }

  assert.equal(isBlockedIp('2606:4700:4700::1111'), false);
});

test('assertPublicHttpTarget rejects localhost names before DNS lookup', async () => {
  let lookupCalled = false;

  await assert.rejects(
    () => assertPublicHttpTarget(
      normalizeHttpUrl('http://localhost'),
      async () => {
        lookupCalled = true;
        return [{ address: '93.184.216.34', family: 4 }];
      },
    ),
    /local and private network targets/i,
  );

  assert.equal(lookupCalled, false);
});

test('assertPublicHttpTarget rejects hostnames that resolve to a private address', async () => {
  const fakeLookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.5', family: 4 },
  ];

  await assert.rejects(
    () => assertPublicHttpTarget(normalizeHttpUrl('https://example.com'), fakeLookup),
    /resolves to a private/i,
  );
});

test('assertPublicHttpTarget accepts a hostname when every resolved address is public', async () => {
  const fakeLookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ];

  await assert.doesNotReject(
    () => assertPublicHttpTarget(normalizeHttpUrl('https://example.com'), fakeLookup),
  );
});

test('createSafeLookup rejects a private address returned during socket DNS lookup', async () => {
  const unsafeLookup = (_hostname, _options, callback) => {
    callback(null, [{ address: '169.254.169.254', family: 4 }]);
  };
  const lookup = createSafeLookup(unsafeLookup);

  await assert.rejects(
    () => runLookup(lookup, 'example.com'),
    /resolves to a private/i,
  );
});

test('createSafeLookup returns a validated public address to the socket', async () => {
  const publicLookup = (_hostname, _options, callback) => {
    callback(null, [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
    ]);
  };
  const lookup = createSafeLookup(publicLookup);

  const result = await runLookup(lookup, 'example.com');
  assert.equal(result.address, '93.184.216.34');
  assert.equal(result.family, 4);
});

test('createSafeLookup preserves all validated addresses when the caller requests all results', async () => {
  const addresses = [
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ];
  const publicLookup = (_hostname, _options, callback) => callback(null, addresses);
  const lookup = createSafeLookup(publicLookup);

  const result = await runLookup(lookup, 'example.com', { all: true });
  assert.deepEqual(result.address, addresses);
  assert.equal(result.family, undefined);
});
