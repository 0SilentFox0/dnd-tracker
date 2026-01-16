// Константи для кольорів
export const SKILL_COLORS = {
  unlocked: "#10b981", // Зелений
  locked: "#9ca3af", // Сірий
  centralUnlocked: "#10b981",
  centralLocked: "#6b7280",
  ultimateUnlocked: "#f59e0b",
  ultimateAvailable: "#fbbf24",
  ultimateLocked: "#374151",
} as const;

// Константи для розмірів елементів
export const SKILL_SIZES = {
  centralSkill: {
    width: "6%",
    height: "6%",
    margin: "-3%",
  },
  ultimateSkill: {
    width: "7.5%",
    height: "7.5%",
    margin: "-3.75%",
  },
  mainSkillLevel: {
    width: "6%",
    height: "6%",
    margin: "-3%",
  },
  racialSkill: {
    width: "72px",
    height: "72px",
  },
} as const;

// Константи для z-index
export const Z_INDEX = {
  sectorLevels: 1,
  innerCircle: 7,
  skills: 8,
  sectorLabel: 9,
  centralSkills: 10,
  ultimateSkill: 11,
  raceLabel: 12,
  racialSkill: 15,
} as const;

// Назви рівнів
export const LEVEL_NAMES = {
  basic: "Основи",
  advanced: "Просунутий",
  expert: "Експертний",
} as const;
