const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRepositoryBaselineAssessment,
  MAX_FILE_BYTES,
  scanSecretIndicators,
  selectRepositoryFiles,
} = require('../scanners/repositoryBaseline');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const COMMIT_SHA = 'c'.repeat(40);
const TREE_SHA = 'd'.repeat(40);

test('secret indicator locations never include matched credential values', () => {
  const credential = 'sk_live_1234567890ABCDEFGH';
  const locations = scanSecretIndicators(`STRIPE_KEY=${credential}\n`, '.env');
  assert.equal(locations.length, 1);
  assert.equal(locations[0].indicatorType, 'stripe-live-secret-key');
  assert.equal(locations[0].path, '.env');
  assert.equal(locations[0].line, 1);
  assert.equal(JSON.stringify(locations).includes(credential), false);
});

test('selection prioritizes manifests and records oversized eligible files', () => {
  const result = selectRepositoryFiles([
    { type: 'blob', path: 'src/index.ts', sha: SHA_A, size: 10 },
    { type: 'blob', path: 'package.json', sha: SHA_B, size: 20 },
    { type: 'blob', path: 'src/large.ts', sha: 'e'.repeat(40), size: MAX_FILE_BYTES + 1 },
    { type: 'blob', path: 'node_modules/example/index.js', sha: 'f'.repeat(40), size: 10 },
  ]);
  assert.equal(result.selected[0].path, 'package.json');
  assert.equal(result.selected.some((entry) => entry.path === 'src/large.ts'), false);
  assert.equal(result.selected.some((entry) => entry.path.includes('node_modules')), false);
  assert.equal(result.skippedOversize, 1);
});

test('oversized eligible file makes baseline coverage incomplete instead of returning partial score', async () => {
  const sourceText = 'export const answer = 42;\n';
  await assert.rejects(
    () => buildRepositoryBaselineAssessment({
      fullName: 'example/repo',
      canonicalUrl: 'https://github.com/example/repo',
      snapshot: {
        commitSha: COMMIT_SHA,
        treeSha: TREE_SHA,
        entries: [
          { type: 'blob', path: 'src/index.ts', sha: SHA_A, size: Buffer.byteLength(sourceText) },
          { type: 'blob', path: 'src/large.ts', sha: SHA_B, size: MAX_FILE_BYTES + 1 },
        ],
      },
      async readBlob() {
        return Buffer.from(sourceText);
      },
    }),
    (error) => error.code === 'REPOSITORY_BASELINE_COVERAGE_INCOMPLETE' && error.statusCode === 422,
  );
});

test('eligible text file without Git tree size metadata fails closed', () => {
  assert.throws(
    () => selectRepositoryFiles([
      { type: 'blob', path: 'src/index.ts', sha: SHA_A, size: null },
    ]),
    (error) => error.code === 'REPOSITORY_TREE_METADATA_INCOMPLETE' && error.statusCode === 422,
  );
});

test('unsafe repository path fails closed instead of being silently skipped', () => {
  assert.throws(
    () => selectRepositoryFiles([
      { type: 'blob', path: '../secret.ts', sha: SHA_A, size: 10 },
    ]),
    (error) => error.code === 'REPOSITORY_TREE_PATH_UNSAFE' && error.statusCode === 422,
  );
});

test('repository assessment pins commit, summarizes manifest counts and redacts secret text', async () => {
  const githubToken = `ghp_${'A'.repeat(36)}`;
  const packageJson = JSON.stringify({
    dependencies: { react: '^19.0.0' },
    devDependencies: { typescript: '^5.0.0' },
  });
  const sourceText = `const token = '${githubToken}';\n`;
  const blobs = new Map([
    [SHA_A, Buffer.from(sourceText)],
    [SHA_B, Buffer.from(packageJson)],
  ]);

  const assessment = await buildRepositoryBaselineAssessment({
    fullName: 'example/repo',
    canonicalUrl: 'https://github.com/example/repo',
    snapshot: {
      commitSha: COMMIT_SHA,
      treeSha: TREE_SHA,
      entries: [
        { type: 'blob', path: 'src/index.ts', sha: SHA_A, size: Buffer.byteLength(sourceText) },
        { type: 'blob', path: 'package.json', sha: SHA_B, size: Buffer.byteLength(packageJson) },
      ],
    },
    async readBlob(sha) {
      return blobs.get(sha);
    },
  });

  assert.equal(assessment.detectorId, 'repository.baseline');
  assert.equal(assessment.detectorVersion, '1.0.0');
  assert.equal(assessment.source, `https://github.com/example/repo@${COMMIT_SHA}`);
  assert.equal(assessment.normalizedData.repository.commitSha, COMMIT_SHA);
  assert.equal(assessment.normalizedData.manifests[0].directDependencyCount, 1);
  assert.equal(assessment.normalizedData.manifests[0].developmentDependencyCount, 1);
  assert.equal(assessment.issues.length, 1);
  assert.equal(assessment.issues[0].ruleId, 'repository.secret.github_token');
  assert.equal(assessment.score, 0);
  assert.equal(JSON.stringify(assessment).includes(githubToken), false);
});

test('clean complete-policy sample receives baseline score 100 with explicit scope notice', async () => {
  const sourceText = 'export const answer = 42;\n';
  const assessment = await buildRepositoryBaselineAssessment({
    fullName: 'example/repo',
    canonicalUrl: 'https://github.com/example/repo',
    snapshot: {
      commitSha: COMMIT_SHA,
      treeSha: TREE_SHA,
      entries: [{ type: 'blob', path: 'src/index.ts', sha: SHA_A, size: Buffer.byteLength(sourceText) }],
    },
    async readBlob() {
      return Buffer.from(sourceText);
    },
  });
  assert.equal(assessment.score, 100);
  assert.equal(assessment.issues.length, 0);
  assert.ok(assessment.notices.some((notice) => notice.includes('not a full SAST')));
  assert.ok(assessment.notices.some((notice) => notice.includes('complete-coverage budgets')));
});
