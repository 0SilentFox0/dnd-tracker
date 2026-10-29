import type { SpellRecognizer } from "./index";

import type { NonRandomEffect } from "@/lib/utils/abilities/schema";
import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

const NEXT_HITS = /\bthe next (\w+) times? (?:that )?you (hit|make an?)\b[^.]{0,80}?\b(melee|ranged)\b[^.]{0,40}?\battacks?\b/i;

const EXTRA = /\b(\d+d(?:4|6|8|10|12|20))\s+([a-z]+) damage\b/i;

const OR_MISS = /\bhits? or misses?\b|\bwhether (?:it|the attack|you) hits? or misses\b/i;

const PUSH = /\bpushed (?:up to |away )?(\d+) feet\b/i;

const PRONE = /\b(?:knocked|fall|falls|be) prone\b/i;

const TURN_END = /\buntil the end of your turn\b/i;

const MOVE_ADJACENT = /\b(?:teleport|move) (?:yourself )?to an unoccupied space (?:adjacent to|within 5 feet of)\b/i;

export const hitRiderSpell: SpellRecognizer = ({ text, cast, ability }) => {
  const next = NEXT_HITS.exec(text);

  if (!next) return null;

  const charges = numberWord(next[1]);

  const rest = text.slice(next.index + next[0].length);

  const dmg = EXTRA.exec(rest);

  if (!charges || charges > 10 || !dmg) return null;

  const onFail: NonRandomEffect[] = [];

  const push = PUSH.exec(rest);

  if (push && Number(push[1]) % 5 === 0 && Number(push[1]) <= 30) onFail.push({ kind: "push", feet: Number(push[1]), from: "caster" });

  if (PRONE.test(rest)) onFail.push({ kind: "applyCondition", condition: "prone", duration: { rounds: 1 } });

  if (ability && onFail.length === 0) return null;

  const expireAtTurnEnd = TURN_END.test(text);

  const moves = MOVE_ADJACENT.test(text);

  const range = spellRange(cast.facts);

  const rider: SpellEffect = {
    kind: "hitRider",
    attackKind: next[3].toLowerCase() as "melee" | "ranged",
    extraDice: dmg[1],
    damageType: dmg[2].toLowerCase(),
    charges,
    duration: { rounds: expireAtTurnEnd ? 1 : durationRounds(cast.facts.duration) },
    ...(next[2].toLowerCase() !== "hit" || OR_MISS.test(text) ? { consumeOnMiss: true } : {}),
    ...(ability && { save: { ability, onFail } }),
    ...(expireAtTurnEnd && { expireAtTurnEnd: true }),
  };

  if (moves && range === "self") return null;

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: moves ? { kind: "enemy", range: range as number } : { kind: "self" },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: moves ? [{ kind: "moveSelf", to: "adjacentToTarget" }, rider] : [rider],
      },
    },
  };
};

export const moveSelfSpell: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const range = spellRange(cast.facts);

  if (!MOVE_ADJACENT.test(text) || ability || damageTypes.length > 0 || range === "self") return null;

  return {
    native: {
      narrative: false,
      riders: [],
      fields: { targeting: { kind: "enemy", range }, resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "moveSelf", to: "adjacentToTarget" }] },
    },
  };
};
