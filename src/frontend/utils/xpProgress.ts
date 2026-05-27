export type XpProjectEntry = {
  id: string;
  name: string;
  experience: number;
  grade: string;
  bonus: boolean;
};

export type XpCheckpoint = {
  id: string;
  label: string;
  gainXp: number;
  totalXp: number;
  level: number;
};

export const XP_REQUIRED = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630, 124446, 145782, 169932, 197316, 228354, 263508, 303366, 348516,
  399672, 457632, 523320, 597786, 682164, 777756, 886074, 1008798, 1147902, 1305486, 1484070,
];

const LAST_KNOWN_LEVEL = XP_REQUIRED.length - 1;
const LAST_KNOWN_LEVEL_SPAN = XP_REQUIRED[LAST_KNOWN_LEVEL] - XP_REQUIRED[LAST_KNOWN_LEVEL - 1];

export function getPrimaryLevel(levels: Array<{ level: number }> | undefined): number {
  if (!levels || levels.length === 0) return 0;
  return Math.max(...levels.map((entry) => entry.level));
}

export function levelToTotalXp(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(0, level) : 0;
  const levelFloor = Math.floor(safeLevel);
  if (levelFloor >= LAST_KNOWN_LEVEL) {
    return XP_REQUIRED[LAST_KNOWN_LEVEL] + (safeLevel - LAST_KNOWN_LEVEL) * LAST_KNOWN_LEVEL_SPAN;
  }
  const baseXp = XP_REQUIRED[levelFloor] ?? XP_REQUIRED[XP_REQUIRED.length - 1];
  const nextXp = XP_REQUIRED[levelFloor + 1] ?? baseXp;
  const progressIntoLevel = (safeLevel - levelFloor) * (nextXp - baseXp);
  return baseXp + progressIntoLevel;
}

export function totalXpToLevel(totalXp: number): number {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  let levelIndex = 0;
  while (XP_REQUIRED[levelIndex + 1] !== undefined && XP_REQUIRED[levelIndex + 1] <= safeXp) {
    levelIndex += 1;
  }
  if (levelIndex >= LAST_KNOWN_LEVEL) {
    return LAST_KNOWN_LEVEL + (safeXp - XP_REQUIRED[LAST_KNOWN_LEVEL]) / LAST_KNOWN_LEVEL_SPAN;
  }
  const rangeStart = XP_REQUIRED[levelIndex] ?? 0;
  const rangeEnd = XP_REQUIRED[levelIndex + 1] ?? rangeStart + 1;
  const fraction = (safeXp - rangeStart) / (rangeEnd - rangeStart);
  return levelIndex + Math.max(0, Math.min(1, fraction));
}

export function projectGainXp(project: XpProjectEntry): number {
  const xpValue = Number(project.experience) || 0;
  const gradeValue = Number(project.grade);
  if (xpValue <= 0 || Number.isNaN(gradeValue)) return 0;
  const bonusMultiplier = project.bonus ? 1.042 : 1;
  return (gradeValue / 100) * xpValue * bonusMultiplier;
}

export function buildProgressSeries(baseLevel: number, projects: XpProjectEntry[]): XpCheckpoint[] {
  let runningXp = levelToTotalXp(baseLevel);
  const checkpoints: XpCheckpoint[] = [
    {
      id: 'start',
      label: 'Start',
      gainXp: 0,
      totalXp: runningXp,
      level: totalXpToLevel(runningXp),
    },
  ];

  projects.forEach((project, index) => {
    const gainXp = projectGainXp(project);
    runningXp += gainXp;
    checkpoints.push({
      id: project.id || `project-${index + 1}`,
      label: project.name?.trim() ? project.name : `Project ${index + 1}`,
      gainXp,
      totalXp: runningXp,
      level: totalXpToLevel(runningXp),
    });
  });

  return checkpoints;
}
