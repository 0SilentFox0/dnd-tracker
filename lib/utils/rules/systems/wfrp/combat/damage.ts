import { MIN_DAMAGE } from "./constants";

export interface WfrpDamageInput {
  weapon: number;
  sb: number;
  netSl: number;
  tb: number;
  ap: number;
  extra?: { key: string; value: number }[];
  minDamage?: number;
}

export function computeWfrpDamage({ weapon, sb, netSl, tb, ap, extra = [], minDamage = MIN_DAMAGE }: WfrpDamageInput): { total: number; steps: { key: string; value: number }[] } {
  const steps = [
    { key: "weapon", value: weapon },
    { key: "sb", value: sb },
    { key: "netSl", value: netSl },
    { key: "tb", value: -tb },
    { key: "ap", value: -ap },
    ...extra,
  ];

  return { total: Math.max(minDamage, steps.reduce((sum, s) => sum + s.value, 0)), steps };
}
