import { MIN_DAMAGE } from "./constants";

export interface WfrpDamageInput {
  weapon: number;
  sb: number;
  netSl: number;
  tb: number;
  ap: number;
}

export function computeWfrpDamage({ weapon, sb, netSl, tb, ap }: WfrpDamageInput): { total: number; steps: { key: string; value: number }[] } {
  const steps = [
    { key: "weapon", value: weapon },
    { key: "sb", value: sb },
    { key: "netSl", value: netSl },
    { key: "tb", value: -tb },
    { key: "ap", value: -ap },
  ];

  return { total: Math.max(MIN_DAMAGE, steps.reduce((sum, s) => sum + s.value, 0)), steps };
}
