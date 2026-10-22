"use client";

import { useCallback, useRef, useState } from "react";

import { type DiceThrowSpec, THROW_MS } from "@/lib/utils/battle/fx/dice";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import type { DieSides } from "@/types/battle";

export const ROLLER_SIDES: readonly DieSides[] = [4, 6, 8, 10, 12, 20];

export const ROLLER_MAX_COUNT = 6;

export interface DiceRollResult {
  sides: DieSides;
  values: number[];
  total: number;
}

export interface DiceRollerPick {
  sides: DieSides;
  count: number;
}

export function useDiceRoller(play: (spec: DiceThrowSpec) => Promise<void>) {
  const [pick, setPick] = useState<DiceRollerPick>({ sides: 20, count: 1 });

  const [result, setResult] = useState<DiceRollResult | null>(null);

  const [isRolling, setIsRolling] = useState(false);

  const runs = useRef(0);

  const set = useCallback((patch: Partial<DiceRollerPick>) => {
    setPick((p) => ({ ...p, ...patch, count: Math.min(ROLLER_MAX_COUNT, Math.max(1, patch.count ?? p.count)) }));
  }, []);

  const roll = useCallback(async () => {
    const run = ++runs.current;

    const values = Array.from({ length: pick.count }, () => rollDie(pick.sides, cryptoRandom));

    const spec: DiceThrowSpec = { seed: Math.floor(cryptoRandom() * 2 ** 31), groups: [values.map((value) => ({ sides: pick.sides, value }))] };

    setIsRolling(true);
    setResult(null);

    const done = play(spec).catch(() => undefined);

    // сума з'являється, коли кубики ляжуть, а не після витримки й згасання
    await Promise.race([done, new Promise((r) => setTimeout(r, THROW_MS))]);

    if (run !== runs.current) return;

    setResult({ sides: pick.sides, values, total: values.reduce((a, v) => a + v, 0) });
    await done;

    if (run === runs.current) setIsRolling(false);
  }, [pick, play]);

  return { pick: { data: pick, set }, result, isRolling, roll };
}
