import type { FxArchetype, FxAuraKind, FxElement, FxFrameKind } from "@/lib/utils/battle/fx";

export const ARCHETYPE_LABEL: Record<FxArchetype, string> = { melee: "Ближній", ranged: "Дальній", bolt: "Снаряд", area: "Область", heal: "Лікування", buff: "Бафф", debuff: "Дебафф", summon: "Прикликання", death: "Смерть", swarm: "Рій", quake: "Землетрус", teleport: "Телепорт", entangle: "Заплутування", meteor: "Метеорит" };

export const ELEMENT_LABEL: Record<FxElement, string> = { fire: "Вогонь", cold: "Холод", lightning: "Блискавка", poison: "Отрута", necrotic: "Некротика", radiant: "Сяйво", arcane: "Аркана", physical: "Фізичний", nature: "Природа", earth: "Земля", fury: "Шал", wind: "Вітер" };

export const AURA_LABEL: Record<FxAuraKind, string> = { stun: "Оглушення", charm: "Чарм", rage: "Шал", bind: "Пута", plague: "Мор", burning: "Горіння", frost: "Холод", decay: "Тлін", bleeding: "Кровотеча", static: "Розряд", marked: "Мітка", curse: "Прокляття", regen: "Регенерація", shield: "Захист", blessing: "Благословення", frozen: "Заморозка", moonmark: "Місячна мітка", dust: "Пил", stings: "Ужалення", roots: "Корені", blind: "Сліпота", bloodlust: "Кровожерність", haste: "Поспіх" };

export const AURA_KINDS = Object.keys(AURA_LABEL) as FxAuraKind[];

export const FRAME_LABEL: Record<FxFrameKind, string> = { ...ELEMENT_LABEL, heal: "Лікування", "physical-melee": "Ближня атака", "physical-ranged": "Стріла" };
