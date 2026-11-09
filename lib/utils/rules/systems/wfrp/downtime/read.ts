import { CHARACTERISTIC_KEYS, SKILL_ADVANCE_KEY_RE, SPEC_RE } from "../characteristics/constants";
import { type Ailment, AILMENTS_MAX, type CoinAmount, type DowntimeState, type Endeavour, type PeriodSnapshot, type TrainingCredit } from "./types";

import { COINS } from "@/lib/constants/inventory";
import { isRecord } from "@/lib/utils/common/is-record";

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isStr = (v: unknown, min: number, max: number): v is string => typeof v === "string" && v.length >= min && v.length <= max;

const AILMENT_KINDS: readonly unknown[] = ["festering", "disease", "injury"];

const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));

function readEndeavour(raw: unknown): Endeavour | undefined {
  if (!isRecord(raw) || !isRecord(raw.params)) return undefined;

  const p = raw.params;

  switch (raw.kind) {
    case "earn":
      if (p.skill === "charm" && keys(p, ["skill"])) return { kind: "earn", params: { skill: "charm" } };

      if (p.skill === "trade" && typeof p.spec === "string" && SPEC_RE.test(p.spec) && keys(p, ["skill", "spec"])) return { kind: "earn", params: { skill: "trade", spec: p.spec } };

      return undefined;
    case "train": {
      const valid = typeof p.key === "string" && (p.kind === "characteristic" ? (CHARACTERISTIC_KEYS as readonly string[]).includes(p.key) : p.kind === "skill" && SKILL_ADVANCE_KEY_RE.test(p.key));

      return valid && keys(p, ["kind", "key"]) ? { kind: "train", params: { kind: p.kind as "characteristic" | "skill", key: p.key as string } } : undefined;
    }
    case "tend":
      return isStr(p.patientId, 1, 64) && keys(p, ["patientId"]) ? { kind: "tend", params: { patientId: p.patientId } } : undefined;
    case "rest":
      return Object.keys(p).length === 0 ? { kind: "rest", params: {} } : undefined;
    case "custom":
      return isStr(p.text, 1, 200) && keys(p, ["text"]) ? { kind: "custom", params: { text: p.text } } : undefined;
    default:
      return undefined;
  }
}

function readAilment(raw: unknown): Ailment | undefined {
  if (!isRecord(raw) || !isStr(raw.id, 1, 64) || !AILMENT_KINDS.includes(raw.kind) || !isInt(raw.daysLeft, 1, 365) || !isStr(raw.label, 1, 80)) return undefined;

  return { id: raw.id, kind: raw.kind as Ailment["kind"], daysLeft: raw.daysLeft, label: raw.label };
}

function readAilments(raw: unknown): Ailment[] | undefined {
  if (raw === undefined) return [];

  if (!Array.isArray(raw) || raw.length > AILMENTS_MAX) return undefined;

  const list = raw.map(readAilment);

  return list.every((a): a is Ailment => a !== undefined) ? list : undefined;
}

function readTraining(raw: unknown): TrainingCredit | undefined {
  if (!isRecord(raw) || !isInt(raw.discount, 1, 1000) || !isStr(raw.key, 1, 80)) return undefined;

  if (raw.kind !== "characteristic" && raw.kind !== "skill") return undefined;

  return { kind: raw.kind, key: raw.key, discount: raw.discount };
}

const isCoinAmount = (v: unknown): v is CoinAmount => isRecord(v) && (COINS as readonly unknown[]).includes(v.coin) && isInt(v.amount, 0, 1e9);

function readSnapshot(raw: unknown): PeriodSnapshot | undefined {
  if (!isRecord(raw) || !isStr(raw.id, 1, 64) || !isStr(raw.at, 1, 40) || !isInt(raw.days, 1, 30) || !isRecord(raw.summary) || !isRecord(raw.before) || !isRecord(raw.after)) return undefined;

  const beforeAilments = readAilments(raw.before.ailments);

  if (!beforeAilments || !Array.isArray(raw.after.ailmentIds) || !raw.after.ailmentIds.every((i) => typeof i === "string")) return undefined;

  if (raw.coins !== undefined && !isCoinAmount(raw.coins)) return undefined;

  return raw as unknown as PeriodSnapshot;
}

export function readDowntime(raw: unknown): DowntimeState | undefined {
  if (!isRecord(raw)) return undefined;

  const ailments = readAilments(raw.ailments);

  if (!ailments) return undefined;

  const endeavour = raw.endeavour === undefined ? undefined : readEndeavour(raw.endeavour);

  const training = raw.training === undefined ? undefined : readTraining(raw.training);

  const lastPeriod = raw.lastPeriod === undefined ? undefined : readSnapshot(raw.lastPeriod);

  if ((raw.endeavour !== undefined && !endeavour) || (raw.training !== undefined && !training) || (raw.lastPeriod !== undefined && !lastPeriod)) return undefined;

  return { ailments, ...(endeavour ? { endeavour } : {}), ...(training ? { training } : {}), ...(lastPeriod ? { lastPeriod } : {}) };
}
