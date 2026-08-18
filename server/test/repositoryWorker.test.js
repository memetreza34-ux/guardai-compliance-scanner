const test = require('node:test');
const assert = require('node:assert/strict');
const {
  executeRepositoryJob,
  numericMetadataId,
  processOneRepositoryJob,
} = require('../workers/repositoryWorker');

const context = {
  jobType: 'repository',
  targetType: 'repository',
  organizationId: 'org-a',
  targetId: 'target-a',
};

function createExecutionHarness({ authorized = true } = {}) {
  const calls = [];
  const secret = `ghp_${'A'.repeat(36)}`;
  const source = Buffer.from(`export const token = '${secret}';\n`);
  const blobSha = 'a'.repeat(40);
  const commitSha = 'b'.repeat(40);
  const treeSha = 'c'.repeat(40);

  const targetRepository = {
    async getTarget() {
      return {
        id: 'target-a',
        provider: 'github',
        verificationState: 'verified',
        verificationMetadata: {
          githubInstallationId: 9876,
          githubRepositoryId: 42,
        },
      };
    },
    async syncGitHubInstallationTargets(input) {
      calls.push(['syncTargets', input]);
    },
    async invalidateGitHubInstallationTargets(input) {
      calls.push(['invalidateTargets', input]);
    },
  };
  const githubRepository = {
    async getActiveInstallation() {
      return {
        organizationId: 'org-a',
        installationId: 9876,
        status: 'active',
      };
    },
  };
  const githubProvider = {
    async listInstallationRepositories() {
      return authorized
        ? [{
            id: 42,
            fullName: 'example/repo',
            private: true,
            archived: false,
            disabled: false,
            defaultBranch: 'main',
          }]
        : [];
    },
    async openRepositoryReader() {
      return {
        async resolveSnapshot(ref) {
          calls.push(['resolveSnapshot', ref]);
          return {
            commitSha,
            treeSha,
            entries: [{ type: 'blob', path: 'src/index.ts', sha: blobSha, size: source.length }],
          };
        },
        async readBlob(sha) {
          calls.push(['readBlob', sha]);
          return source;
        },
      };
    },
  };

  return {
    calls,
    githubProvider,
    githubRepository,
    secret,
    targetRepository,
  };
}

test('numeric repository provenance IDs fail closed when malformed', () => {
  assert.equal(numericMetadataId('42', 'repository'), 42);
  assert.throws(
    () => numericMetadataId('not-a-number', 'repository'),
    (error) => error.code === 'REPOSITORY_TARGET_PROVENANCE_INVALID',
  );
});

test('repository execution rechecks GitHub authorization and returns redacted assessment', async () => {
  const harness = createExecutionHarness();
  const assessment = await executeRepositoryJob(context, harness);
  assert.equal(assessment.detectorId, 'repository.baseline');
  assert.equal(assessment.normalizedData.repository.fullName, 'example/repo');
  assert.equal(assessment.issues[0].ruleId, 'repository.secret.github_token');
  assert.equal(JSON.stringify(assessment).includes(harness.secret), false);
  assert.ok(harness.calls.some((entry) => entry[0] === 'syncTargets'));
  assert.ok(harness.calls.some((entry) => entry[0] === 'resolveSnapshot' && entry[1] === 'main'));
});

test('repository removed from current GitHub authorization fails before content read', async () => {
  const harness = createExecutionHarness({ authorized: false });
  await assert.rejects(
    () => executeRepositoryJob(context, harness),
    (error) => error.code === 'TARGET_VERIFICATION_LOST' && error.statusCode === 409,
  );
  assert.equal(harness.calls.some((entry) => entry[0] === 'resolveSnapshot'), false);
  assert.equal(harness.calls.some((entry) => entry[0] === 'readBlob'), false);
});

test('persistent repository job completes only with the redacted bounded assessment', async () => {
  const harness = createExecutionHarness();
  const writes = [];
  const jobRepository = {
    async claimNextJob(input) {
      assert.deepEqual(input.jobTypes, ['repository']);
      return { id: 'job-a', scanId: 'scan-a' };
    },
    async getExecutionContext({ jobId, workerId }) {
      assert.equal(jobId, 'job-a');
      assert.equal(workerId, 'repository:test:1');
      return context;
    },
    async renewLease() {
      writes.push(['renew']);
    },
    async completeJob(input) {
      writes.push(['complete', input]);
      return { scanCompleted: true };
    },
  };
  const jobFailureService = {
    async fail(input) {
      writes.push(['fail', input]);
      return { retryScheduled: false };
    },
  };

  const result = await processOneRepositoryJob({
    jobRepository,
    jobFailureService,
    githubRepository: harness.githubRepository,
    githubProvider: harness.githubProvider,
    targetRepository: harness.targetRepository,
    workerId: 'repository:test:1',
    leaseSeconds: 60,
  });

  assert.equal(result.state, 'completed');
  const completion = writes.find((entry) => entry[0] === 'complete');
  assert.ok(completion);
  assert.equal(JSON.stringify(completion[1].assessment).includes(harness.secret), false);
  assert.equal(writes.some((entry) => entry[0] === 'fail'), false);
});
