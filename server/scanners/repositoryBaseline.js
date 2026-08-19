const { HttpError } = require('../lib/httpError');
const { getRepositoryRuleForFinding, registry } = require('./repositoryRuleRegistry');

const MAX_TREE_ENTRIES = 5000;
const MAX_SELECTED_FILES = 100;
const MAX_FILE_BYTES = 128 * 1024;
const MAX_TOTAL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_INDICATOR_LOCATIONS = 100;

const IGNORED_PATH_SEGMENTS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'target',
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.py', '.rb', '.php', '.go', '.rs', '.java', '.kt', '.kts', '.cs',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.xml', '.gradle', '.tf', '.tfvars',
  '.md', '.txt',
]);

const MANIFESTS = Object.freeze({
  'package.json': 'npm',
  'package-lock.json': 'npm-lock',
  'npm-shrinkwrap.json': 'npm-lock',
  'pnpm-lock.yaml': 'pnpm-lock',
  'yarn.lock': 'yarn-lock',
  'requirements.txt': 'python-requirements',
  'pipfile': 'python-pipenv',
  'pipfile.lock': 'python-pipenv-lock',
  'pyproject.toml': 'python-pyproject',
  'poetry.lock': 'python-poetry-lock',
  'gemfile': 'ruby-bundler',
  'gemfile.lock': 'ruby-bundler-lock',
  'composer.json': 'php-composer',
  'composer.lock': 'php-composer-lock',
  'go.mod': 'go-modules',
  'go.sum': 'go-modules-lock',
  'cargo.toml': 'rust-cargo',
  'cargo.lock': 'rust-cargo-lock',
  'pom.xml': 'maven',
  'build.gradle': 'gradle',
  'build.gradle.kts': 'gradle',
  'gradle.lockfile': 'gradle-lock',
});

const SECRET_INDICATORS = Object.freeze([
  {
    findingId: 'private-key-material-indicator',
    indicatorType: 'private-key-material',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    findingId: 'github-token-indicator',
    indicatorType: 'github-token',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9_.-]{20,}\b/g,
  },
  {
    findingId: 'aws-access-key-indicator',
    indicatorType: 'aws-access-key-id',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    findingId: 'stripe-live-secret-indicator',
    indicatorType: 'stripe-live-secret-key',
    pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/g,
  },
]);

function basename(path) {
  return path.slice(path.lastIndexOf('/') + 1);
}

function extension(path) {
  const name = basename(path).toLowerCase();
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index) : '';
}

function isSafeRepositoryPath(path) {
  if (typeof path !== 'string' || path.length < 1 || path.length > 1000 || path.includes('\0')) return false;
  if (path.startsWith('/') || path.includes('\\')) return false;
  const segments = path.split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isIgnoredPath(path) {
  return path.split('/').some((segment) => IGNORED_PATH_SEGMENTS.has(segment.toLowerCase()));
}

function manifestEcosystem(path) {
  return MANIFESTS[basename(path).toLowerCase()] || null;
}

function isTextCandidate(path) {
  const name = basename(path).toLowerCase();
  if (name === 'dockerfile' || name === 'makefile' || name === '.npmrc' || name === '.pypirc') return true;
  if (name === '.env' || name.startsWith('.env.')) return true;
  return TEXT_EXTENSIONS.has(extension(path));
}

function selectRepositoryFiles(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Repository tree entries must be an array.');
  if (entries.length > MAX_TREE_ENTRIES) {
    throw new HttpError(
      422,
      'Repository tree exceeds the current GuardAI entry budget.',
      'REPOSITORY_TREE_BUDGET_EXCEEDED',
      { maximumEntries: MAX_TREE_ENTRIES },
    );
  }

  const blobs = entries.filter((entry) => entry?.type === 'blob');
  const unsafePath = blobs.find((entry) => !isSafeRepositoryPath(entry.path));
  if (unsafePath) {
    throw new HttpError(
      422,
      'Repository tree contains a path outside the current GuardAI safe-path policy.',
      'REPOSITORY_TREE_PATH_UNSAFE',
    );
  }

  const candidates = blobs
    .filter((entry) => !isIgnoredPath(entry.path))
    .filter((entry) => manifestEcosystem(entry.path) || isTextCandidate(entry.path));

  const missingSize = candidates.find(
    (entry) => !Number.isSafeInteger(entry.size) || entry.size < 0,
  );
  if (missingSize) {
    throw new HttpError(
      422,
      'Repository tree lacks complete size metadata for an eligible file.',
      'REPOSITORY_TREE_METADATA_INCOMPLETE',
    );
  }

  const eligible = candidates.sort((left, right) => {
    const leftManifest = manifestEcosystem(left.path) ? 0 : 1;
    const rightManifest = manifestEcosystem(right.path) ? 0 : 1;
    return leftManifest - rightManifest || left.path.localeCompare(right.path);
  });

  const selected = [];
  let selectedBytes = 0;
  let skippedOversize = 0;
  let skippedBudget = 0;

  for (const entry of eligible) {
    if (entry.size > MAX_FILE_BYTES) {
      skippedOversize += 1;
      continue;
    }
    if (selected.length >= MAX_SELECTED_FILES || selectedBytes + entry.size > MAX_TOTAL_FILE_BYTES) {
      skippedBudget += 1;
      continue;
    }
    selected.push(entry);
    selectedBytes += entry.size;
  }

  return {
    eligibleCount: eligible.length,
    selected,
    selectedBytes,
    skippedBudget,
    skippedOversize,
  };
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }
  return line;
}

function scanSecretIndicators(text, path, remainingLimit = MAX_INDICATOR_LOCATIONS) {
  if (typeof text !== 'string') throw new TypeError('Repository text must be a string.');
  const locations = [];
  for (const indicator of SECRET_INDICATORS) {
    const pattern = new RegExp(indicator.pattern.source, indicator.pattern.flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      locations.push({
        findingId: indicator.findingId,
        indicatorType: indicator.indicatorType,
        path,
        line: lineNumberAt(text, match.index),
      });
      if (locations.length >= remainingLimit) return locations;
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  return locations;
}

function summarizeJsonManifest(path, ecosystem, text) {
  if (!['npm', 'php-composer'].includes(ecosystem)) {
    return { path, ecosystem, directDependencyCount: null, developmentDependencyCount: null };
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    if (ecosystem === 'npm') {
      const direct = ['dependencies', 'optionalDependencies', 'peerDependencies']
        .reduce((sum, key) => sum + (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])
          ? Object.keys(parsed[key]).length
          : 0), 0);
      const development = parsed.devDependencies && typeof parsed.devDependencies === 'object' && !Array.isArray(parsed.devDependencies)
        ? Object.keys(parsed.devDependencies).length
        : 0;
      return { path, ecosystem, directDependencyCount: direct, developmentDependencyCount: development };
    }
    const direct = parsed.require && typeof parsed.require === 'object' && !Array.isArray(parsed.require)
      ? Object.keys(parsed.require).length
      : 0;
    const development = parsed['require-dev'] && typeof parsed['require-dev'] === 'object' && !Array.isArray(parsed['require-dev'])
      ? Object.keys(parsed['require-dev']).length
      : 0;
    return { path, ecosystem, directDependencyCount: direct, developmentDependencyCount: development };
  } catch {
    return {
      path,
      ecosystem,
      directDependencyCount: null,
      developmentDependencyCount: null,
      parseState: 'invalid-json',
    };
  }
}

async function buildRepositoryBaselineAssessment({
  fullName,
  canonicalUrl,
  snapshot,
  readBlob,
}) {
  if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.entries)) {
    throw new TypeError('Repository baseline requires a resolved snapshot.');
  }
  if (typeof readBlob !== 'function') throw new TypeError('Repository baseline requires blob reader.');

  const selection = selectRepositoryFiles(snapshot.entries);
  if (selection.skippedBudget > 0 || selection.skippedOversize > 0) {
    throw new HttpError(
      422,
      'Repository baseline cannot produce a score because eligible files exceed the current complete-coverage budget.',
      'REPOSITORY_BASELINE_COVERAGE_INCOMPLETE',
      {
        eligibleFiles: selection.eligibleCount,
        selectedFiles: selection.selected.length,
        skippedOversize: selection.skippedOversize,
        skippedBudget: selection.skippedBudget,
      },
    );
  }

  const manifests = [];
  const indicatorLocations = [];
  let scannedBytes = 0;

  for (const entry of selection.selected) {
    const bytes = await readBlob(entry.sha, MAX_FILE_BYTES);
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_FILE_BYTES) {
      throw new HttpError(502, 'Repository blob reader returned invalid bytes.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
    }
    if (bytes.includes(0)) {
      throw new HttpError(
        422,
        'Repository baseline encountered binary content under a text-eligible path.',
        'REPOSITORY_BASELINE_COVERAGE_INCOMPLETE',
        { path: entry.path },
      );
    }

    scannedBytes += bytes.length;
    const text = bytes.toString('utf8');
    const ecosystem = manifestEcosystem(entry.path);
    if (ecosystem) manifests.push(summarizeJsonManifest(entry.path, ecosystem, text));

    if (indicatorLocations.length < MAX_INDICATOR_LOCATIONS && isTextCandidate(entry.path)) {
      indicatorLocations.push(...scanSecretIndicators(
        text,
        entry.path,
        MAX_INDICATOR_LOCATIONS - indicatorLocations.length,
      ));
    }
  }

  const grouped = new Map();
  for (const location of indicatorLocations) {
    const current = grouped.get(location.findingId) || [];
    current.push(location);
    grouped.set(location.findingId, current);
  }

  const issues = [...grouped.entries()].map(([findingId, locations]) => {
    const rule = getRepositoryRuleForFinding(findingId);
    return {
      id: findingId,
      title: rule.title,
      description: `GuardAI observed ${locations.length} location(s) matching this high-confidence credential indicator within the bounded repository snapshot. The matched credential text is not persisted.`,
      severity: rule.defaultSeverity,
      remediation: rule.remediation,
      ruleId: rule.id,
      ruleVersion: rule.version,
      ruleDefinitionHash: rule.definitionHash,
    };
  });

  return {
    detectorId: registry.detectorId,
    detectorVersion: registry.detectorVersion,
    evidenceType: 'repository-baseline',
    source: `${canonicalUrl}@${snapshot.commitSha}`,
    normalizedData: {
      repository: {
        fullName,
        commitSha: snapshot.commitSha,
        treeSha: snapshot.treeSha,
      },
      coverage: {
        treeEntryCount: snapshot.entries.length,
        eligibleTextOrManifestFiles: selection.eligibleCount,
        selectedFiles: selection.selected.length,
        scannedBytes,
        maxTreeEntries: MAX_TREE_ENTRIES,
        maxSelectedFiles: MAX_SELECTED_FILES,
        maxFileBytes: MAX_FILE_BYTES,
        maxTotalFileBytes: MAX_TOTAL_FILE_BYTES,
      },
      manifests: manifests.slice(0, 100),
      secretIndicators: {
        locationCount: indicatorLocations.length,
        truncatedAtLimit: indicatorLocations.length >= MAX_INDICATOR_LOCATIONS,
        locations: indicatorLocations.map(({ findingId, indicatorType, path, line }) => ({
          findingId,
          indicatorType,
          path,
          line,
        })),
      },
    },
    score: issues.length === 0 ? 100 : 0,
    issues,
    notices: [
      'Repository score covers only this bounded GuardAI baseline. It is not a full SAST, comprehensive secret scan, dependency vulnerability assessment or SBOM.',
      'No matched credential value is persisted; Evidence stores only indicator type and file/line location.',
      'All files eligible under the current GuardAI repository-baseline selection policy fit within the configured complete-coverage budgets for this assessment.',
    ],
  };
}

module.exports = {
  buildRepositoryBaselineAssessment,
  isSafeRepositoryPath,
  isTextCandidate,
  manifestEcosystem,
  MANIFESTS,
  MAX_FILE_BYTES,
  MAX_INDICATOR_LOCATIONS,
  MAX_SELECTED_FILES,
  MAX_TOTAL_FILE_BYTES,
  MAX_TREE_ENTRIES,
  scanSecretIndicators,
  selectRepositoryFiles,
  SECRET_INDICATORS,
  summarizeJsonManifest,
};
