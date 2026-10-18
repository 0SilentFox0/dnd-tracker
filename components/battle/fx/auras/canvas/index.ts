import { bindAura } from "./bind";
import { bleedingAura } from "./bleeding";
import { blessingAura } from "./blessing";
import { blindAura } from "./blind";
import { bloodlustAura } from "./bloodlust";
import { burningAura } from "./burning";
import { charmAura } from "./charm";
import { curseAura } from "./curse";
import { decayAura } from "./decay";
import { deflectAura } from "./deflect";
import { dustAura } from "./dust";
import { frostAura } from "./frost";
import { frozenAura } from "./frozen";
import { hasteAura } from "./haste";
import { holyweaponAura } from "./holyweapon";
import { hourglassAura } from "./hourglass";
import { lifedomeAura } from "./lifedome";
import { markedAura } from "./marked";
import { mightAura } from "./might";
import { moonmarkAura } from "./moonmark";
import { plagueAura } from "./plague";
import { rageAura } from "./rage";
import { regenAura } from "./regen";
import { rootsAura } from "./roots";
import { shieldAura } from "./shield";
import { spellwardAura } from "./spellward";
import { staticAura } from "./static";
import { stingsAura } from "./stings";
import { stoneskinAura } from "./stoneskin";
import { stunAura } from "./stun";
import { sunglowAura } from "./sunglow";
import type { AuraAnimation } from "./types";

import type { FxAuraKind } from "@/lib/utils/battle/fx";

export const AURA_ANIMATIONS: Record<FxAuraKind, AuraAnimation> = {
  stun: stunAura,
  charm: charmAura,
  rage: rageAura,
  bind: bindAura,
  plague: plagueAura,
  burning: burningAura,
  frost: frostAura,
  decay: decayAura,
  bleeding: bleedingAura,
  static: staticAura,
  marked: markedAura,
  curse: curseAura,
  regen: regenAura,
  shield: shieldAura,
  blessing: blessingAura,
  frozen: frozenAura,
  moonmark: moonmarkAura,
  dust: dustAura,
  stings: stingsAura,
  roots: rootsAura,
  blind: blindAura,
  bloodlust: bloodlustAura,
  haste: hasteAura,
  hourglass: hourglassAura,
  stoneskin: stoneskinAura,
  lifedome: lifedomeAura,
  sunglow: sunglowAura,
  spellward: spellwardAura,
  deflect: deflectAura,
  might: mightAura,
  holyweapon: holyweaponAura,
};
