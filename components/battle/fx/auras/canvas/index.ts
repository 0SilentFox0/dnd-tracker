import { bindAura } from "./bind";
import { bleedingAura } from "./bleeding";
import { blessingAura } from "./blessing";
import { burningAura } from "./burning";
import { charmAura } from "./charm";
import { curseAura } from "./curse";
import { decayAura } from "./decay";
import { frostAura } from "./frost";
import { markedAura } from "./marked";
import { plagueAura } from "./plague";
import { rageAura } from "./rage";
import { regenAura } from "./regen";
import { shieldAura } from "./shield";
import { staticAura } from "./static";
import { stunAura } from "./stun";
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
  frozen: frostAura,
  moonmark: markedAura,
  dust: decayAura,
  stings: plagueAura,
  roots: bindAura,
  blind: curseAura,
  bloodlust: rageAura,
  haste: blessingAura,
};
