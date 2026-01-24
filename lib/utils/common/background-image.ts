/**
 * Утиліта для визначення фонового зображення на основі поточного шляху
 */

const BACKGROUND_MAP: Record<string, string> = {
  "/artifacts": "artefacts-bg.jpg",
  "/battles": "battle-bg.jpg",
  "/character": "character-bg.jpg",
  "/npc-heroes": "character-bg.jpg",
  "/races": "races-bg.jpg",
  "/skill-trees": "skill-tree-bg.jpg",
  "/skills": "skills-bg.jpg",
  "/spells": "spell-lab.jpg",
  "/units": "units-bg.jpg",
  "/main-skills": "skills-bg.jpg", // Використовуємо skills-bg для main-skills
};

const DEFAULT_BACKGROUND = "tavern.png";

/**
 * Отримує назву файлу фонового зображення на основі шляху
 */
export function getBackgroundImage(pathname: string): string {
  // Перевіряємо точкові збіги спочатку (від найбільш специфічних до найменш специфічних)
  const sortedPaths = Object.entries(BACKGROUND_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [path, image] of sortedPaths) {
    if (pathname.includes(path)) {
      return image;
    }
  }

  return DEFAULT_BACKGROUND;
}

/**
 * Отримує повний шлях до фонового зображення
 */
export function getBackgroundImageUrl(pathname: string): string {
  const imageName = getBackgroundImage(pathname);

  return `/screen-bg/${imageName}`;
}
