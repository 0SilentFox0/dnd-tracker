// Функція для затемнення кольору
export function darkenColor(color: string, percent: number): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.floor(r * (1 - percent));
  const newG = Math.floor(g * (1 - percent));
  const newB = Math.floor(b * (1 - percent));

  return `#${newR.toString(16).padStart(2, "0")}${newG
    .toString(16)
    .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

// Конвертуємо координати в відсотки для позиціонування
export function getPositionPercent(
  angle: number,
  radiusPercent: number
): { left: string; top: string } {
  const center = 50; // Центр контейнера в відсотках
  const x = center + radiusPercent * Math.cos(angle);
  const y = center + radiusPercent * Math.sin(angle);
  return { left: `${x}%`, top: `${y}%` };
}

// Константи для розмірів
export const SKILL_TREE_CONSTANTS = {
  containerSize: 800,
  outerRadiusPercent: 35, // 35% від центру (70% діаметр)
  innerRadiusPercent: 15, // 15% від центру (30% діаметр)
  mainSkillRadiusPercent: 40, // 40% від центру (80% діаметр)
} as const;
