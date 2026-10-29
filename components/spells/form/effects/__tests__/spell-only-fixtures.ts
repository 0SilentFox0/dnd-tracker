const FEAR_CAST = { targeting: { kind: "enemy", range: 30 }, resolution: { kind: "attack" }, dice: 2, dieSides: 8, addAbilityMod: true, anchorMarkId: "reactionAnchor", perObjectFeet: 10, auto: { on: "attackAgainstMarked" }, effects: [{ kind: "dealDamage", damageType: "lightning", amount: { spellRoll: 100 } }] };

const TRIGGER = { save: { ability: "charisma" }, effects: [{ kind: "applyCondition", condition: "prone", duration: { rounds: 1 } }] };

export interface Fixture {
  effect: Record<string, unknown>;
  edit?: { id: string; value: string; patch: Record<string, unknown> };
}

export const SPELL_ONLY_FIXTURES: Record<string, Fixture> = {
  grantCast: { effect: { kind: "grantCast", label: "Bite", cost: "reaction", uses: 2, duration: { rounds: 10 }, target: "eventTarget", cast: FEAR_CAST }, edit: { id: "cast.dice", value: "3", patch: { cast: { ...FEAR_CAST, dice: 3 } } } },
  hitRider: {
    effect: { kind: "hitRider", attackKind: "melee", extraDice: "1d6", damageType: "force", charges: 3, consumeOnMiss: true, expireAtTurnEnd: true, duration: { rounds: 1 }, save: { ability: "strength", onFail: [{ kind: "push", feet: 10, from: "caster" }] } },
    edit: { id: "charges", value: "4", patch: { charges: 4 } },
  },
  anchoredZone: { effect: { kind: "anchoredZone", radiusFeet: 20, side: "enemies", excludeBearer: true, endsWhenStartOutside: true, duration: { rounds: 10 }, onEnter: TRIGGER, onTurnStart: { save: { ability: "charisma" }, effects: [] } }, edit: { id: "radiusFeet", value: "25", patch: { radiusFeet: 25 } } },
  summonInline: {
    effect: {
      kind: "summonInline",
      name: "Guard",
      size: "medium",
      ac: "spellDc",
      hp: null,
      count: 2,
      upcastEvery: 2,
      attacks: [{ name: "Spear", attackBonus: 5, damageDice: "1d8", damageType: "piercing", range: "10 ft" }],
      aura: { radiusFeet: 10, side: "enemies", onEnter: TRIGGER, onTurnStart: { effects: [{ kind: "applyCondition", condition: "prone", duration: { rounds: 1 } }] } },
      duration: { rounds: 10 },
    },
    edit: { id: "count", value: "3", patch: { count: 3 } },
  },
  transform: { effect: { kind: "transform", unitId: "u1", revertAtZero: true, duration: { rounds: 10 } }, edit: { id: "duration", value: "5", patch: { duration: { rounds: 5 } } } },
  inputDice: { effect: { kind: "inputDice", label: "Dice", max: 20 }, edit: { id: "max", value: "10", patch: { max: 10 } } },
  createTerrain: { effect: { kind: "createTerrain", terrain: "wall", shape: "line", cells: 4, rounds: 10 }, edit: { id: "cells", value: "6", patch: { cells: 6 } } },
  moveSelf: { effect: { kind: "moveSelf", to: "adjacentToTarget" } },
  chooseOne: { effect: { kind: "chooseOne", options: [{ kind: "heal", amount: { spellRoll: 100 } }, { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "radiant" }] } },
  dealDamage: {
    effect: { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "force", byDistance: [{ maxFeet: 30, dice: "4d6" }, { maxFeet: 60, dice: "2d6" }], delayIfBeyond: { feet: 30, perRoundFeet: 30 } },
    edit: { id: "delayIfBeyond.feet", value: "40", patch: { delayIfBeyond: { feet: 40, perRoundFeet: 30 } } },
  },
};
