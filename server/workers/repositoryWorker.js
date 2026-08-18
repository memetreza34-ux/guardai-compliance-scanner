const { setTimeout: delay } = require('node:timers/promises');
const { HttpError } = require('../lib/httpError');
const { buildRepositoryBaselineAssessment } = require('../scanners/repositoryBaseline');

const REPOSITORY_JOB_TYPE = 'repository';

function numericMetadataId(value, field) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new HttpError(409, `Repository Target ${field} provenance is invalid.`, 'REPOSITORY_TARGET_PROVENANCE_INVALID');
  }
  return parsed;
}

async function executeRepositoryJob(context, {
  githubRepository,
  githubProvider,
  targetRepository,
}) {
  if (context.jobType !== REPOSITORY_JOB_TYPE) {
    throw new HttpError(500, 'Repository worker received the wrong job type.', 'WORKER_JOB_TYPE_MISMATCH');
  }
  if (context.targetType !== 'repository') {
    throw new HttpError(500, 'Repository worker requires a repository target.', 'WORKER_TARGET_TYPE_MISMATCH');
  }

  const target = await targetRepository.getTarget(context.organizationId, context.targetId);
  if (!target || target.provider !== 'github' || target.verificationState !== 'verified') {
    throw new HttpError(409, 'GitHub repository Target authorization is no longer valid.', 'TARGET_VERIFICATION_LOST');
  }

  const installationId = numericMetadataId(
    target.verificationMetadata.githubInstallationId,
    'installation',
  );
  const repositoryId = numericMetadataId(
    target.verificationMetadata.githubRepositoryId,
    'repository',
  );

  const installation = await githubRepository.getActiveInstallation(context.organizationId);
  if (
    !installation ||
    installation.status !== 'active' ||
    installation.installationId !== installationId
  ) {
    await targetRepository.invalidateGitHubInstallationTargets({
      organizationId: context.organizationId,
      installationId,
    });
    throw new HttpError(409, 'GitHub App installation is not active for this Target.', 'TARGET_VERIFICATION_LOST');
  }

  const repositories = await githubProvider.listInstallationRepositories(installationId);
  await targetRepository.syncGitHubInstallationTargets({
    organizationId: context.organizationId,
    installationId,
    authorizedRepositoryIds: repositories.map((repository) => repository.id),
  });

  const repository = repositories.find((candidate) => candidate.id === repositoryId);
  if (!repository || repository.disabled === true) {
    throw new HttpError(409, 'GitHub repository is no longer authorized for this Target.', 'TARGET_VERIFICATION_LOST');
  }
  if (typeof repository.defaultBranch !== 'string' || repository.defaultBranch.length === 0) {
    throw new HttpError(422, 'GitHub repository has no readable default branch.', 'GITHUB_REPOSITORY_REF_INVALID');
  }

  const reader = await githubProvider.openRepositoryReader(installationId, repository.fullName);
  const snapshot = await reader.resolveSnapshot(repository.defaultBranch);
  const canonicalUrl = `https://github.com/${repository.fullName}`;

  return buildRepositoryBaselineAssessment({
    fullName: repository.fullName,
    canonicalUrl,
    snapshot,
    readBlob: reader.readBlob,
  });
}

function startLeaseHeartbeat({ jobRepository, jobId, workerId, leaseSeconds }) {
  const controller = new AbortController();
  let heartbeatError = null;
  const intervalMs = Math.max(5000, Math.min(30000, Math.floor((leaseSeconds * 1000) / 3)));

  const promise = (async () => {
    while (!controller.signal.aborted) {
      try {
        await delay(intervalMs, undefined, { signal: controller.signal });
      } catch (error) {
        if (error?.name === 'AbortError') break;
        heartbeatError = error;
        break;
      }
      if (controller.signal.aborted) break;
      try {
        await jobRepository.renewLease({ jobId, workerId, leaseSeconds });
      } catch (error) {
        heartbeatError = error;
        break;
      }
    }
  })();

  return {
    async stop() {
      controller.abort();
      try {
        await promise;
      } catch (error) {
        if (error?.name !== 'AbortError' && !heartbeatError) heartbeatError = error;
      }
      return heartbeatError;
    },
    getError() {
      return heartbeatError;
    },
  };
}

async function processOneRepositoryJob({
  jobRepository,
  jobFailureService,
  githubRepository,
  githubProvider,
  targetRepository,
  workerId,
  leaseSeconds = 60,
}) {
  if (!jobRepository) throw new TypeError('Repository worker requires Job repository.');
  if (!jobFailureService || typeof jobFailureService.fail !== 'function') {
    throw new TypeError('Repository worker requires Job failure service.');
  }
  if (!githubRepository || !githubProvider || !targetRepository) {
    throw new TypeError('Repository worker requires GitHub integration persistence.');
  }

  const job = await jobRepository.claimNextJob({
    workerId,
    jobTypes: [REPOSITORY_JOB_TYPE],
    leaseSeconds,
  });
  if (!job) return { state: 'idle' };

  const heartbeat = startLeaseHeartbeat({
    jobRepository,
    jobId: job.id,
    workerId,
    leaseSeconds,
  });

  try {
    const context = await jobRepository.getExecutionContext({ jobId: job.id, workerId });
    const assessment = await executeRepositoryJob(context, {
      githubRepository,
      githubProvider,
      targetRepository,
    });
    const heartbeatError = heartbeat.getError();
    if (heartbeatError) throw heartbeatError;

    const completion = await jobRepository.completeJob({
      jobId: job.id,
      workerId,
      assessment,
    });
    return {
      state: 'completed',
      jobId: job.id,
      scanId: job.scanId,
      completion,
    };
  } catch (error) {
    const failure = await jobFailureService.fail({ jobId: job.id, workerId, error });
    return {
      state: failure.retryScheduled ? 'retrying' : 'failed',
      jobId: job.id,
      scanId: job.scanId,
      failure,
    };
  } finally {
    await heartbeat.stop();
  }
}

module.exports = {
  executeRepositoryJob,
  numericMetadataId,
  processOneRepositoryJob,
  REPOSITORY_JOB_TYPE,
  startLeaseHeartbeat,
};
