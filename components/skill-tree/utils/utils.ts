const NAMED_COLORS: Record<string, string> = {
  sandybrown: "#f4a460",
  gainsboro: "#dcdcdc",
  yellow: "#ffff00",
  forestgreen: "#228b22",
  darkblue: "#00008b",
  darkred: "#8b0000",
  dodgerblue: "#1e90ff",
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (full.length !== 6) return null;

  const r = parseInt(full.substring(0, 2), 16);

  const g = parseInt(full.substring(2, 4), 16);

  const b = parseInt(full.substring(4, 6), 16);

  return { r, g, b };
}

function toRgb(color: string) {
  const lower = color.trim().toLowerCase();

  if (lower.startsWith("#")) {
    return hexToRgb(lower);
  }

  if (lower.startsWith("rgb")) {
    const match = lower.match(/rgba?\(([^)]+)\)/);

    if (!match) return null;

    const parts = match[1].split(",").map((value) => parseFloat(value.trim()));

    if (parts.length < 3) return null;

    return { r: parts[0], g: parts[1], b: parts[2] };
  }

  const namedHex = NAMED_COLORS[lower];

  if (namedHex) {
    return hexToRgb(namedHex);
  }

  return null;
}

// Функція для затемнення кольору
export function darkenColor(color: string, percent: number): string {
  const rgb = toRgb(color);

  if (!rgb) return color;

  const newR = Math.floor(rgb.r * (1 - percent));

  const newG = Math.floor(rgb.g * (1 - percent));

  const newB = Math.floor(rgb.b * (1 - percent));

  return `#${newR.toString(16).padStart(2, "0")}${newG
    .toString(16)
    .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

// Конвертуємо координати в відсотки для позиціонування
// Округлюємо до 3 знаків після коми для уникнення помилок гідрації
export function getPositionPercent(
  angle: number,
  radiusPercent: number,
): { left: string; top: string } {
  const center = 50; // Центр контейнера в відсотках

  const x = center + radiusPercent * Math.cos(angle);

  const y = center + radiusPercent * Math.sin(angle);

  // Округлюємо до 3 знаків після коми для однакового форматування на сервері та клієнті
  const roundedX = Math.round(x * 1000) / 1000;

  const roundedY = Math.round(y * 1000) / 1000;

  return { left: `${roundedX}%`, top: `${roundedY}%` };
}

// Константи для розмірів
export const SKILL_TREE_CONSTANTS = {
  containerSize: 800,
  containerSizeMobile: 340, // Менший розмір для мобільних
  outerRadiusPercent: 35, // 35% від центру (70% діаметр)
  innerRadiusPercent: 15, // 15% від центру (30% діаметр)
  mainSkillRadiusPercent: 42, // 40% від центру (80% діаметр)
} as const;
