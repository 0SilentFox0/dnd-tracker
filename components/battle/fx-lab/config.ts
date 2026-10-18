import type { FxEngine, FxEngineId, FxReaction, FxScenarioId } from "./types";

export interface LabUnit {
  id: string;
  name: string;
  side: "ally" | "enemy";
  hp: number;
  maxHp: number;
}

export const LAB_UNITS: LabUnit[] = [
  { id: "a1", name: "Воїн", side: "ally", hp: 30, maxHp: 52 },
  { id: "a2", name: "Чарівниця", side: "ally", hp: 34, maxHp: 34 },
  { id: "e1", name: "Огр", side: "enemy", hp: 70, maxHp: 70 },
  { id: "e2", name: "Лич", side: "enemy", hp: 48, maxHp: 48 },
];

export interface LabScenario {
  id: FxScenarioId;
  label: string;
  from: string;
  to: string;
  reaction: FxReaction;
  amount: number;
}

export const LAB_SCENARIOS: LabScenario[] = [
  { id: "fireball", label: "Вогняна куля", from: "a2", to: "e1", reaction: "damage", amount: 18 },
  { id: "slash", label: "Удар мечем", from: "a1", to: "e1", reaction: "damage", amount: 11 },
  { id: "heal", label: "Лікування", from: "a2", to: "a1", reaction: "heal", amount: 14 },
  { id: "curse", label: "Прокляття", from: "a2", to: "e2", reaction: "debuff", amount: 4 },
];

export interface LabEngineInfo {
  id: FxEngineId;
  title: string;
  weight: string;
  note: string;
  load: () => Promise<FxEngine>;
}

export const LAB_ENGINES: LabEngineInfo[] = [
  { id: "canvas", title: "Canvas 2D (своє)", weight: "3 КБ", note: "Власний рантайм без бібліотек; цикл працює лише під час анімації.", load: () => import("./engines/canvas").then((m) => m.canvasEngine) },
  { id: "sprites", title: "CC0-спрайти", weight: "1 КБ + 22 КБ png", note: "Покадрові спрайт-листи (Gothicvania, StarsteelGaming).", load: () => import("./engines/sprites").then((m) => m.spritesEngine) },
];
