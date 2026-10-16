/**
 * Мапа назв артефактів → URL іконок (game-icons.net, CC BY 3.0).
 * Використовується в seed-artifacts.ts та update-artifact-icons.ts.
 */

const BASE = "https://game-icons.net/icons/ffffff/000000/1x1";

export const ARTIFACT_ICONS: Record<string, string> = {
  // --- Зброя ближнього бою ---
  "Довгий меч": `${BASE}/lorc/crossed-swords.svg`,
  "Короткий меч": `${BASE}/skoll/gladius.svg`,
  Сокира: `${BASE}/lorc/battle-axe.svg`,
  "Бойовий молот": `${BASE}/delapouite/warhammer.svg`,
  Булава: `${BASE}/delapouite/flanged-mace.svg`,
  Палиця: `${BASE}/delapouite/wood-club.svg`,
  Кинджал: `${BASE}/lorc/dripping-knife.svg`,
  Глефа: `${BASE}/lorc/grapple.svg`,
  Алебарда: `${BASE}/lorc/halberd-shuriken.svg`,
  Спис: `${BASE}/lorc/barbed-spear.svg`,
  Ратуш: `${BASE}/delapouite/bo.svg`,
  Батіг: `${BASE}/lorc/whip.svg`,
  Рапіра: `${BASE}/lorc/stiletto.svg`,
  Шабля: `${BASE}/lorc/sparkling-sabre.svg`,
  "Дворучний меч": `${BASE}/lorc/winged-sword.svg`,
  "Дворучна сокира": `${BASE}/delapouite/sharp-axe.svg`,
  Моргенштерн: `${BASE}/lorc/spiked-mace.svg`,
  Ціп: `${BASE}/delapouite/flail.svg`,
  Трезубець: `${BASE}/lorc/trident.svg`,
  Серп: `${BASE}/lorc/scythe.svg`,
  // --- Зброя дальнього бою ---
  "Короткий лук": `${BASE}/lorc/pocket-bow.svg`,
  "Довгий лук": `${BASE}/delapouite/bow-arrow.svg`,
  "Легкий арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  "Важкий арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  "Ручний арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  Праща: `${BASE}/delapouite/sling.svg`,
  Дротик: `${BASE}/lorc/heavy-arrow.svg`,
  "Метальна сокира": `${BASE}/delapouite/tomahawk.svg`,
  "Метальний ніж": `${BASE}/lorc/backstab.svg`,
  "Духова трубка": `${BASE}/delapouite/bo.svg`,
  // --- Шоломи ---
  "Кований шолом": `${BASE}/lorc/heavy-helm.svg`,
  "Кольчужний ковпак": `${BASE}/lorc/hood.svg`,
  "Відкритий шолом": `${BASE}/lorc/visored-helm.svg`,
  Басцинет: `${BASE}/lorc/barbute.svg`,
  Салад: `${BASE}/lorc/crested-helmet.svg`,
  // --- Броня ---
  "Шкіряна броня": `${BASE}/delapouite/leather-armor.svg`,
  Кольчуга: `${BASE}/lorc/mail-shirt.svg`,
  Кіраса: `${BASE}/lorc/breastplate.svg`,
  "Латна броня": `${BASE}/lorc/layered-armor.svg`,
  "Броня з драконьої луски": `${BASE}/lorc/scale-mail.svg`,
  // --- Черевики ---
  "Шкіряні черевики": `${BASE}/lorc/leather-boot.svg`,
  "Черевики швидкості": `${BASE}/delapouite/running-shoe.svg`,
  "Залізні чоботи": `${BASE}/delapouite/metal-boot.svg`,
  "Черевики стелсу": `${BASE}/lorc/boot-prints.svg`,
  "Чоботи мандрівника": `${BASE}/lorc/walking-boot.svg`,
};
