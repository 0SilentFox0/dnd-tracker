/**
 * Розмір клієнтської дельти бою: поточна (log у {message,params}) vs кодек {m,p} vs старий вигляд (resultText без log).
 *   DELTA_DUMP=<file> pnpm battle-sweep --mode sweep --keep-battles   # збирає дельти
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/sim/delta-size.ts <file>
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import { encodeLog } from "@/lib/utils/battle/log/codec";
import { resultTextOf } from "@/scripts/sim/log-text";

type Entry = { log?: unknown[]; resultText?: string; [k: string]: unknown };

type Delta = { log: Entry[]; [k: string]: unknown };

const rows = readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l) as { label: string; delta: Delta });

const forms: Record<string, (d: Delta) => Delta> = {
  now: (d) => d,
  codec: (d) => ({ ...d, log: d.log.map((e) => (e.log ? { ...e, log: encodeLog(e.log as never) } : e)) }),
  old: (d) => ({ ...d, log: d.log.map((e) => { if (!e.log) return e;

 const { log: _log, ...rest } = e;

 return { ...rest, resultText: resultTextOf(e as never) }; }) }),
};

const size = (v: unknown) => { const s = JSON.stringify(v);

 return [Buffer.byteLength(s), gzipSync(s).length] as const; };

const groups = new Map<string, Delta[]>();

for (const { label, delta } of rows) if (delta.log.some((e) => e.log)) groups.set(label, [...(groups.get(label) ?? []), delta]);

console.log("kind\tn\tnow raw/gz\tcodec raw/gz\told raw/gz\tcodec vs now gz\told vs now gz");

for (const [label, ds] of groups) {
  const avg = Object.fromEntries(Object.entries(forms).map(([k, f]) => {
    const s = ds.map((d) => size(f(d)));

    return [k, [s.reduce((a, x) => a + x[0], 0) / ds.length, s.reduce((a, x) => a + x[1], 0) / ds.length]];
  }));

  const pct = (k: string) => `${(((avg[k][1] - avg.now[1]) / avg.now[1]) * 100).toFixed(1)}%`;

  console.log([label, ds.length, ...Object.keys(forms).map((k) => `${avg[k][0].toFixed(0)}/${avg[k][1].toFixed(0)}`), pct("codec"), pct("old")].join("\t"));
}
