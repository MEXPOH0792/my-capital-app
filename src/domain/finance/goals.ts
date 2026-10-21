export interface GoalJourney {
  milestones: number[];
  previous: number;
  next: number;
  afterNext: number | null;
  stepProgress: number;
  remainingToNext: number;
  remainingToTarget: number;
  completedCount: number;
}

// Milestones are derived as fractions of the user's personal capital goal,
// not from fixed absolute amounts. This keeps the tree growth, the "next
// step" figure and the progress journey all scaled to the goal the user set
// in "Цель: капитал" — a 200k goal fills the tree at 200k, a 5M goal fills it
// at 5M. (Previously milestones were hardcoded up to 1,000,000, so any goal
// smaller than that still showed milestones marching toward 1M.)
const MILESTONE_FRACTIONS: number[] = [0.1, 0.25, 0.5, 0.75, 1];

export const getGoalJourney = (capital: number, targetCapital: number): GoalJourney => {
  const safeTarget = Math.max(1, targetCapital);

  // Build goal-relative milestones, dedupe and keep only those up to (and
  // including) the goal itself. The final milestone is always the goal.
  const milestones = [...new Set(MILESTONE_FRACTIONS.map((fraction) => Math.round(safeTarget * fraction)))]
    .filter((point) => point > 0 && point <= safeTarget)
    .sort((a, b) => a - b);
  if (milestones.length === 0 || milestones[milestones.length - 1] !== safeTarget) {
    milestones.push(safeTarget);
  }

  const previous = [...milestones].reverse().find((point) => capital >= point) ?? 0;
  const next = milestones.find((point) => capital < point) ?? safeTarget;
  const afterNext = milestones.find((point) => point > next) ?? null;
  const stepRange = Math.max(1, next - previous);
  const stepProgress = Math.min(100, Math.max(0, ((capital - previous) / stepRange) * 100));
  const remainingToNext = Math.max(0, next - capital);
  const remainingToTarget = Math.max(0, safeTarget - capital);

  return {
    milestones,
    previous,
    next,
    afterNext,
    stepProgress,
    remainingToNext,
    remainingToTarget,
    completedCount: milestones.filter((point) => capital >= point).length,
  };
};
