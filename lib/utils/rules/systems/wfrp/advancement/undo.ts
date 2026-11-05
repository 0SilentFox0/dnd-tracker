import { CHARACTERISTIC_KEYS, type Characteristics, type LedgerEntry } from "../characteristics/keys";

export type UndoResult = { ok: true; next: Characteristics; entry: LedgerEntry } | { ok: false; error: "LEDGER_EMPTY" | "LEDGER_STALE" };

const without = <T>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

function dropTick(c: Characteristics, tick: string | undefined): Characteristics {
  if (!tick || !c.career?.ticks.includes(tick)) return c;

  return { ...c, career: { ...c.career, ticks: c.career.ticks.filter((t) => t !== tick) } };
}

export function planUndo(characteristics: Characteristics): UndoResult {
  const result = undoLast(characteristics);

  return result.ok ? { ...result, next: dropTick(result.next, result.entry.tick) } : result;
}

function undoLast(characteristics: Characteristics): UndoResult {
  const entry = characteristics.ledger[characteristics.ledger.length - 1];

  if (!entry) return { ok: false, error: "LEDGER_EMPTY" };

  const ledger = characteristics.ledger.slice(0, -1);

  const stale = { ok: false, error: "LEDGER_STALE" } as const;

  if (entry.kind === "characteristic") {
    const key = CHARACTERISTIC_KEYS.find((k) => k === entry.key);

    if (!key || characteristics.advances[key] !== entry.to) return stale;

    return { ok: true, next: { ...characteristics, advances: { ...characteristics.advances, [key]: entry.from }, ledger }, entry };
  }

  if (entry.kind === "skill") {
    if ((characteristics.skillAdvances[entry.key] ?? 0) !== entry.to) return stale;

    const skillAdvances = entry.from === 0 ? without(characteristics.skillAdvances, entry.key) : { ...characteristics.skillAdvances, [entry.key]: entry.from };

    return { ok: true, next: { ...characteristics, skillAdvances, ledger }, entry };
  }

  if ((characteristics.talents[entry.key] ?? 0) !== entry.to) return stale;

  const talents = entry.from === 0 ? without(characteristics.talents, entry.key) : { ...characteristics.talents, [entry.key]: entry.from };

  return { ok: true, next: { ...characteristics, talents, ledger }, entry };
}
