const { HttpError } = require('../lib/httpError');

function scoreFromIssues(issues) {
  const penalty = issues.reduce((total, issue) => {
    if (issue.severity === 'critical') return total + 30;
    if (issue.severity === 'warning') return total + 15;
    return total;
  }, 0);

  return Math.max(0, 100 - penalty);
}

function makeAiCategory(issues) {
  const score = scoreFromIssues(issues);
  return {
    score,
    totalChecks: 1,
    passedChecks: issues.length === 0 ? 1 : 0,
    status: issues.some((issue) => issue.severity === 'critical')
      ? 'critical'
      : issues.length > 0
        ? 'warning'
        : 'compliant',
    issues,
  };
}

function calculateOverallScore(categories) {
  const scores = Object.values(categories)
    .map((category) => category?.score)
    .filter((score) => typeof score === 'number' && Number.isFinite(score));

  if (scores.length === 0) {
    throw new HttpError(422, 'None of the requested scanner modules produced an assessment.');
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

module.exports = {
  calculateOverallScore,
  makeAiCategory,
  scoreFromIssues,
};
