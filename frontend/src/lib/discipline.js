// Discipline calculations — spec-exact. Do not change these rules.
export const HS_MAX = 40;
export const HS_ANNUAL_MAX = 120;

export function termMark(person, term) {
  const key = `term${term}_marks`;
  const v = Number(person?.[key]);
  return Number.isFinite(v) ? v : HS_MAX;
}

// Annual score = term1 + term2 + term3 (missing terms count as 40 each).
export function annualScore(person) {
  return termMark(person, 1) + termMark(person, 2) + termMark(person, 3);
}

// Annual percentage = annual score / 120 × 100.
export function annualPercentage(person) {
  return (annualScore(person) / HS_ANNUAL_MAX) * 100;
}

export function ratingFor(percentage) {
  if (percentage >= 90) return { label: 'Excellent', tone: 'good' };
  if (percentage >= 75) return { label: 'Good', tone: 'ok' };
  if (percentage >= 60) return { label: 'Fair', tone: 'warn' };
  if (percentage >= 40) return { label: 'Poor', tone: 'bad' };
  return { label: 'Critical', tone: 'bad' };
}

export const TRACK_LABELS = {
  HIGH_SCHOOL: 'High School', UNIVERSITY: 'University', COMPANY: 'Company',
  ORGANIZATION: 'Organization', COMMUNITY: 'Community'
};
