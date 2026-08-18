const { HttpError } = require('../lib/httpError');

const GITHUB_FULL_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

function normalizeGitHubRepositoryTarget(repository) {
  if (!repository || typeof repository !== 'object') {
    throw new HttpError(502, 'GitHub repository metadata is invalid.', 'GITHUB_REPOSITORY_METADATA_INVALID');
  }
  if (!Number.isSafeInteger(repository.id) || repository.id <= 0) {
    throw new HttpError(502, 'GitHub repository ID is invalid.', 'GITHUB_REPOSITORY_METADATA_INVALID');
  }
  if (
    typeof repository.fullName !== 'string' ||
    !GITHUB_FULL_NAME_PATTERN.test(repository.fullName)
  ) {
    throw new HttpError(502, 'GitHub repository name is invalid.', 'GITHUB_REPOSITORY_METADATA_INVALID');
  }

  const canonicalUrl = new URL(`/${repository.fullName}`, 'https://github.com').toString();
  return {
    repositoryId: repository.id,
    displayName: repository.fullName,
    canonicalUrl,
    provider: 'github',
    private: repository.private === true,
    archived: repository.archived === true,
    disabled: repository.disabled === true,
    defaultBranch: typeof repository.defaultBranch === 'string'
      ? repository.defaultBranch
      : null,
  };
}

module.exports = {
  GITHUB_FULL_NAME_PATTERN,
  normalizeGitHubRepositoryTarget,
};
