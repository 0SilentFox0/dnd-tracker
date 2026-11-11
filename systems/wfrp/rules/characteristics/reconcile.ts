import { preserveServerOwned, redactLedger, withoutLedgers } from "../advancement/privacy";
import { type CareerState, type Characteristics, DEFAULT_CHARACTERISTICS, readCharacteristics } from "./keys";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/utils/api/content-error";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

const sameCareer = (a?: CareerState | null, b?: CareerState | null) => (!a && !b) || Boolean(a && b && a.careerId === b.careerId && a.tier === b.tier && a.ticks.length === b.ticks.length && a.ticks.every((t, i) => t === b.ticks[i]));

const read = (value: unknown): Characteristics => readCharacteristics({ characteristics: value });

export const reconcileCharacteristics: NonNullable<RuleSystemDefinition["characteristics"]["reconcile"]> = (storedRaw, incomingRaw, { isDM, baseline }) => {
  const stored = read(storedRaw);

  const incoming = read(incomingRaw);

  if (!isDM) return preserveServerOwned(stored, incoming);

  const moved = incoming.ledger.length !== stored.ledger.length || incoming.ledger.at(-1)?.id !== stored.ledger.at(-1)?.id || incoming.spentArchived !== stored.spentArchived;

  const careerMoved = baseline !== undefined && !sameCareer(read(baseline).career, stored.career);

  if (moved || careerMoved) throw new ContentError(API_ERRORS.CHARACTERISTICS_CHANGED, 409);

  return { ...withoutLedgers(incoming), ...(stored.downtime ? { downtime: stored.downtime } : {}), ...(stored.corruption ? { corruption: stored.corruption } : {}) };
};

export const redactCharacteristics: NonNullable<RuleSystemDefinition["characteristics"]["redact"]> = (value, viewer) => redactLedger(value as Characteristics, viewer);

export const initialCharacteristics: NonNullable<RuleSystemDefinition["characteristics"]["initial"]> = value => withoutLedgers(value);

export const isEmptyCharacteristics = (v: unknown) => v == null || (typeof v === "object" && Object.keys(v).length === 0) || hashJson(v) === hashJson(DEFAULT_CHARACTERISTICS);
