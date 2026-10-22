import { useCallback, useEffect, useRef, useState } from "react";

import { revealSchedule } from "@/lib/utils/characters/generate/reveal";

const TICK_MS = 60;

export interface RollStep<K extends string> {
  key: K;
  pool: () => string | number;
  final: string | number;
}

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useRollReveal<K extends string>() {
  const [display, setDisplay] = useState<Partial<Record<K, string | number>>>({});

  const [settled, setSettled] = useState<ReadonlySet<K>>(() => new Set<K>());

  const [rolling, setRolling] = useState(false);

  const timers = useRef<{ interval?: ReturnType<typeof setInterval>; timeouts: Array<ReturnType<typeof setTimeout>> }>({ timeouts: [] });

  const finals = useRef<Array<RollStep<K>>>([]);

  const clear = useCallback(() => {
    clearInterval(timers.current.interval);
    timers.current.timeouts.forEach(clearTimeout);
    timers.current = { timeouts: [] };
  }, []);

  const finish = useCallback(() => {
    clear();
    setDisplay(Object.fromEntries(finals.current.map((s) => [s.key, s.final])) as Partial<Record<K, string | number>>);
    setSettled(new Set(finals.current.map((s) => s.key)));
    setRolling(false);
  }, [clear]);

  const start = useCallback(
    (steps: Array<RollStep<K>>) => {
      clear();

      finals.current = steps;

      if (!steps.length || prefersReducedMotion()) {
        finish();

        return;
      }

      const open = new Set<K>(steps.map((s) => s.key));

      const spin = () => {
        const next = Object.fromEntries(steps.filter((s) => open.has(s.key)).map((s) => [s.key, s.pool()])) as Partial<Record<K, string | number>>;

        setDisplay((prev) => ({ ...prev, ...next }));
      };

      setSettled(new Set<K>());
      setRolling(true);
      spin();

      timers.current.interval = setInterval(spin, TICK_MS);

      const at = revealSchedule(steps.length);

      steps.forEach((step, i) => {
        timers.current.timeouts.push(
          setTimeout(() => {
            open.delete(step.key);
            setSettled((prev) => new Set(prev).add(step.key));
            setDisplay((prev) => ({ ...prev, [step.key]: step.final }));

            if (i === steps.length - 1) {
              clear();
              setRolling(false);
            }
          }, at[i]),
        );
      });
    },
    [clear, finish],
  );

  useEffect(() => clear, [clear]);

  return { display, settled, rolling, start, skip: finish };
}
