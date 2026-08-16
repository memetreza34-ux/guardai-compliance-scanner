const dns = require('node:dns');
const net = require('node:net');
const { HttpError } = require('./httpError');

function normalizeHttpUrl(rawUrl) {
  const value = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, 'Target must be a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpError(400, 'Only HTTP and HTTPS targets are supported.');
  }

  if (parsed.username || parsed.password) {
    throw new HttpError(400, 'URLs containing credentials are not allowed.');
  }

  if (parsed.port && !['80', '443'].includes(parsed.port)) {
    throw new HttpError(400, 'Only standard HTTP/HTTPS ports are allowed.');
  }

  return parsed;
}

function isBlockedIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(address) {
  const normalized = address.toLowerCase().split('%')[0];

  if (normalized === '::' || normalized === '::1') return true;

  // Block every IPv4-mapped IPv6 literal. This is deliberately conservative:
  // it avoids alternate textual encodings bypassing the IPv4 range checks.
  if (normalized.startsWith('::ffff:')) return true;

  const firstHextet = Number.parseInt(normalized.split(':')[0] || '0', 16);
  const isUniqueLocal = firstHextet >= 0xfc00 && firstHextet <= 0xfdff;
  const isLinkLocal = firstHextet >= 0xfe80 && firstHextet <= 0xfebf;
  const isMulticast = firstHextet >= 0xff00 && firstHextet <= 0xffff;
  const isDocumentation = normalized.startsWith('2001:db8:') || normalized === '2001:db8::';

  return isUniqueLocal || isLinkLocal || isMulticast || isDocumentation;
}

function isBlockedIp(address) {
  const version = net.isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

function validateResolvedAddresses(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new HttpError(400, 'Target hostname could not be resolved.');
  }

  if (addresses.some(({ address }) => isBlockedIp(address))) {
    throw new HttpError(400, 'Target resolves to a private, loopback, link-local or reserved address.');
  }

  return addresses;
}

async function assertPublicHttpTarget(parsedUrl, lookup = dns.promises.lookup) {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new HttpError(400, 'Local and private network targets are not allowed.');
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new HttpError(400, 'Private, loopback, link-local, reserved and metadata targets are not allowed.');
    }
    return;
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Target hostname could not be resolved.');
  }

  validateResolvedAddresses(addresses);
}

function createSafeLookup(lookup = dns.lookup) {
  return (hostname, options, callback) => {
    const requestedAll = typeof options === 'object' && options !== null && options.all === true;
    const family = typeof options === 'number'
      ? options
      : typeof options === 'object' && options !== null
        ? options.family
        : undefined;

    lookup(
      hostname,
      {
        all: true,
        verbatim: true,
        ...(family ? { family } : {}),
      },
      (error, addresses) => {
        if (error) {
          callback(error);
          return;
        }

        try {
          const validated = validateResolvedAddresses(addresses);

          if (requestedAll) {
            callback(null, validated);
            return;
          }

          const selected = validated[0];
          callback(null, selected.address, selected.family);
        } catch (validationError) {
          callback(validationError);
        }
      },
    );
  };
}

module.exports = {
  assertPublicHttpTarget,
  createSafeLookup,
  isBlockedIp,
  normalizeHttpUrl,
  validateResolvedAddresses,
};
