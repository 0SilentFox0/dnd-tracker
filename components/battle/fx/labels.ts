import type { FxArchetype, FxAuraKind, FxElement, FxFrameKind } from "@/lib/utils/battle/fx";

export const ARCHETYPE_LABEL: Record<FxArchetype, string> = { melee: "Ближній", ranged: "Дальній", bolt: "Снаряд", area: "Область", heal: "Лікування", buff: "Бафф", debuff: "Дебафф", summon: "Прикликання", death: "Смерть", swarm: "Рій", quake: "Землетрус", teleport: "Телепорт", entangle: "Заплутування", meteor: "Метеорит", eldritch: "Потойбічна стріла", slow: "Сповільнення", haste: "Поспіх", stoneskin: "Кам'яна шкіра", cleanse: "Очищення", regenerate: "Регенерація", might: "Праведна міць", deflect: "Ухилення", holyword: "Слово світла", empower: "Божественна сила", spellward: "Магічний імунітет", sunbeam: "Вічне світло", retribution: "Божественна відплата", resurrect: "Воскресіння" };

export const ELEMENT_LABEL: Record<FxElement, string> = { fire: "Вогонь", cold: "Холод", lightning: "Блискавка", poison: "Отрута", necrotic: "Некротика", radiant: "Сяйво", arcane: "Аркана", physical: "Фізичний", nature: "Природа", earth: "Земля", fury: "Шал", wind: "Вітер" };

export const AURA_LABEL: Record<FxAuraKind, string> = { stun: "Оглушення", charm: "Чарм", rage: "Шал", bind: "Пута", plague: "Мор", burning: "Горіння", frost: "Холод", decay: "Тлін", bleeding: "Кровотеча", static: "Розряд", marked: "Мітка", curse: "Прокляття", regen: "Регенерація", shield: "Захист", blessing: "Благословення", frozen: "Заморозка", moonmark: "Місячна мітка", dust: "Пил", stings: "Ужалення", roots: "Корені", blind: "Сліпота", bloodlust: "Кровожерність", haste: "Поспіх", hourglass: "Пісочний годинник", stoneskin: "Кам'яна шкіра", lifedome: "Живий щит", sunglow: "Сонячне сяйво", spellward: "Антимагічний купол", deflect: "Відбиття стріл", might: "Праведне лезо", holyweapon: "Освячена зброя" };

export const AURA_KINDS = Object.keys(AURA_LABEL) as FxAuraKind[];

export const FRAME_LABEL: Record<FxFrameKind, string> = { ...ELEMENT_LABEL, heal: "Лікування", "physical-melee": "Ближня атака", "physical-ranged": "Стріла" };
