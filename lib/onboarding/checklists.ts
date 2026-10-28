import type { DmFacts, OnboardingStep, PlayerFacts } from "@/lib/onboarding/types";

const dm = (campaignId: string, path: string) => `/campaigns/${campaignId}/dm/${path}`;

export const DM_STEPS: OnboardingStep<DmFacts>[] = [
  { id: "races", title: "Створи расу", description: "Раса задає героям базові характеристики, доступні скіли й дерево прокачки.", href: (c) => dm(c, "races"), helpSlug: "dm-world", isDone: (f) => f.races > 0 },
  { id: "units", title: "Додай юнітів-супротивників", description: "Юніти — моби й загони для боїв. Їх можна створити вручну або імпортувати з JSON.", href: (c) => dm(c, "units"), helpSlug: "dm-units-balance", isDone: (f) => f.units > 0 },
  { id: "players", title: "Запроси гравців", description: "Надішли гравцям інвайт-код із блоку «Налаштування кампанії» нижче.", href: (c) => `/campaigns/${c}#invite`, helpSlug: "dm-quickstart", isDone: (f) => f.players > 0 },
  {
    id: "characters",
    title: "Схвали або створи героя",
    description: (f) => (f.pendingDrafts > 0 ? `Гравці надіслали чернеток на схвалення: ${f.pendingDrafts}.` : "Гравці створюють чернетки героїв, ти їх схвалюєш — або створюєш героя сам."),
    href: (c) => dm(c, "characters"),
    helpSlug: "dm-quickstart",
    isDone: (f) => f.activePlayerCharacters > 0,
  },
  { id: "battle-prepare", title: "Підготуй бій", description: "Збери сцену бою: сторони, юніти, мапа. Баланс підкаже, чи бій чесний.", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battles > 0 },
  { id: "battle-run", title: "Проведи перший бій", description: "Запусти бій — у гравців у хедері з'явиться кнопка бою.", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battlesStarted > 0 },
  { id: "scenario", title: "Напиши сценарій", description: "Сцени, нотатки майстра й біографії героїв в одному рукописі.", href: (c) => dm(c, "scenario"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.scenarioPages > 0 },
  { id: "show", title: "Підготуй показ сцен", description: "Слайди з музикою, які гравці бачать на своїх екранах.", href: (c) => dm(c, "show"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.decks > 0 },
  { id: "music", title: "Додай музику бою", description: "Бібліотека треків для плеєра в бою.", href: (c) => dm(c, "music"), helpSlug: "dm-battle", optional: true, isDone: (f) => f.tracks > 0 },
  { id: "ai", title: "Підключи AI-асистента", description: "Власний ключ Claude, OpenAI або Gemini — співавтор сценарію й помічник під час гри.", href: () => "/settings/ai", helpSlug: "dm-ai", optional: true, isDone: (f) => f.aiKeys > 0 },
];

export const PLAYER_STEPS: OnboardingStep<PlayerFacts>[] = [
  {
    id: "character",
    title: "Створи героя",
    description: (f) => (f.ownCharacter === "pending" ? "Чернетка чекає схвалення ДМ — щойно він її прийме, герой з'явиться тут." : "Створи чернетку героя: раса, ім'я, портрет. ДМ її схвалить."),
    href: (c) => `/campaigns/${c}/character`,
    helpSlug: "player-quickstart",
    isDone: (f) => f.ownCharacter === "active",
  },
  { id: "sheet", title: "Ознайомся з аркушем героя", description: "Характеристики, скіли, заклинання, артефакти й прокачка.", href: (c) => `/campaigns/${c}/character`, helpSlug: "player-quickstart", isDone: (f) => f.sheetSeen || f.joinedBattle },
  { id: "battle", title: "Приєднайся до бою", description: "ДМ запустить бій — у хедері з'явиться кнопка бою.", helpSlug: "player-battle", isDone: (f) => f.joinedBattle },
  { id: "show", title: "Показ сцен", description: "Коли ДМ показує сцену, вона відкриється в розділі «Показ».", href: (c) => `/campaigns/${c}/show`, optional: true, informational: true, isDone: () => false },
];
