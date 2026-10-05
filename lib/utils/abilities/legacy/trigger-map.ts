import type { ConversionIssue } from "./types";

import type { Condition, DamageKind, Limits, Trigger } from "@/lib/utils/abilities/schema";

export interface MappedTrigger {
  trigger: Trigger;
  condition?: Condition;
  limits?: Limits;
  stackable?: boolean;
  counter?: { attackKinds: DamageKind[] };
  notes: string[];
  issues: ConversionIssue[];
}

const SIMPLE: Record<string, Trigger> = {
  passive: { event: "passive" },
  onBattleStart: { event: "battleStart" },
  startRound: { event: "roundStart" },
  endRound: { event: "roundEnd" },
  beforeOwnerAttack: { event: "attack", phase: "before", role: "attacker" },
  onAttack: { event: "attack", phase: "before", role: "attacker" },
  afterOwnerAttack: { event: "attack", phase: "after", role: "attacker" },
  beforeEnemyAttack: { event: "attack", phase: "before", role: "target" },
  afterEnemyAttack: { event: "attack", phase: "after", role: "target" },
  beforeOwnerSpellCast: { event: "spellCast", phase: "before", role: "caster" },
  onCast: { event: "spellCast", phase: "before", role: "caster" },
  afterOwnerSpellCast: { event: "spellCast", phase: "after", role: "caster" },
  beforeEnemySpellCast: { event: "spellCast", phase: "before", role: "target" },
  afterEnemySpellCast: { event: "spellCast", phase: "after", role: "target" },
  onHit: { event: "hit", role: "attacker" },
  onKill: { event: "kill", role: "killer" },
  onAllyDeath: { event: "kill", role: "victimSide" },
  onLethalDamage: { event: "lethalDamage" },
  onFirstRangedAttack: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
  onMoraleSuccess: { event: "moraleCheck", result: "success", whose: "self" },
  allyMoraleCheck: { event: "moraleCheck", result: "any", whose: "ally" },
  bonusAction: { event: "bonusAction" },
};

const SEMANTIC_CHANGE = new Set(["beforeEnemyAttack", "afterEnemyAttack", "beforeEnemySpellCast", "afterEnemySpellCast"]);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function mapModifiers(m: unknown, out: MappedTrigger) {
  if (!isRecord(m)) return;

  const limits: Limits = { ...out.limits };

  if (typeof m.probability === "number" && m.probability > 0) {
    const chance = Math.round(m.probability <= 1 ? m.probability * 100 : m.probability);

    if (chance < 100) limits.chance = Math.max(1, chance);
  }

  if (m.oncePerBattle === true) limits.perBattle = 1;

  if (m.twicePerBattle === true) limits.perBattle = 2;

  if (Object.keys(limits).length) out.limits = limits;

  if (m.stackable === true) out.stackable = true;

  if (typeof m.condition === "string" && m.condition) {
    out.notes.push(`Умова: ${m.condition}`);
    out.issues.push({ severity: "loss", message: `Текстова умова «${m.condition}» не автоматизована (тепер — нотатка)` });
  }

  if (typeof m.attackId === "string" && m.attackId) {
    out.issues.push({ severity: "loss", message: `Прив'язка до атаки ${m.attackId} не переноситься` });
  }
}

export function mapLegacyTrigger(raw: unknown): MappedTrigger | null {
  if (!isRecord(raw)) return null;

  if (raw.type === "complex") return mapComplex(raw);

  const name = typeof raw.trigger === "string" ? raw.trigger : "";

  const modifiers = isRecord(raw.modifiers) ? raw.modifiers : {};

  if (name === "onFirstHitTakenPerRound") {
    const kind = modifiers.responseType;

    return {
      trigger: { event: "passive" },
      counter: { attackKinds: [kind === "ranged" || kind === "magic" ? kind : "melee"] },
      notes: [],
      issues: [],
    };
  }

  const trigger = SIMPLE[name];

  if (!trigger) return null;

  const out: MappedTrigger = { trigger, notes: [], issues: [] };

  if (name === "onFirstRangedAttack") out.limits = { perBattle: 1 };

  if (SEMANTIC_CHANGE.has(name)) {
    out.issues.push({ severity: "behavior", message: `${name}: тепер спрацьовує, коли атакують/кастують на власника` });
  }

  mapModifiers(modifiers, out);

  if (trigger.event === "passive") delete out.limits;

  return out;
}

function mapComplex(raw: Record<string, unknown>): MappedTrigger {
  const out: MappedTrigger = { trigger: { event: "turnStart" }, notes: [], issues: [] };

  out.issues.push({ severity: "behavior", message: "Складний тригер тепер перевіряється на початку ходу власника" });

  const who = raw.target === "ally" ? "anyAlly" : raw.target === "enemy" ? "anyEnemy" : "self";

  const value = typeof raw.value === "number" ? raw.value : NaN;

  if (raw.stat === "HP" && raw.valueType === "percent" && Number.isFinite(value)) {
    const percent = Math.min(100, Math.max(1, Math.round(value <= 1 ? value * 100 : value)));

    out.condition = { type: String(raw.operator).startsWith("<") ? "hpBelow" : "hpAbove", who, percent };
  } else {
    out.issues.push({ severity: "loss", message: `Умова ${String(raw.stat)} ${String(raw.operator)} ${String(raw.value)} не переноситься` });
  }

  mapModifiers(raw.modifiers, out);

  return out;
}
