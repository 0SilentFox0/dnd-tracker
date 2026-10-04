import { stableStringify } from "./stable-json";
import type { ParticipantColumns, StoredParticipant } from "./types";

export interface ParticipantUpdate {
  next: StoredParticipant;
  columnsChanged: boolean;
  stateChanged: boolean;
  snapshotChanged: boolean;
}

export interface ParticipantsDiff {
  created: StoredParticipant[];
  updated: ParticipantUpdate[];
  removed: StoredParticipant[];
}

function sameColumns(a: ParticipantColumns, b: ParticipantColumns): boolean {
  return (Object.keys(a) as Array<keyof ParticipantColumns>).every((k) => a[k] === b[k]);
}

export function diffParticipants(before: StoredParticipant[], after: StoredParticipant[]): ParticipantsDiff {
  const prev = new Map(before.map((p) => [p.columns.id, p]));

  const nextIds = new Set(after.map((p) => p.columns.id));

  const created: StoredParticipant[] = [];

  const updated: ParticipantUpdate[] = [];

  for (const next of after) {
    const old = prev.get(next.columns.id);

    if (!old) {
      created.push(next);
      continue;
    }

    const columnsChanged = !sameColumns(old.columns, next.columns);

    const stateChanged = stableStringify(old.state) !== stableStringify(next.state);

    const snapshotChanged = old.snapshotHash !== next.snapshotHash;

    if (columnsChanged || stateChanged || snapshotChanged) {
      updated.push({ next, columnsChanged, stateChanged, snapshotChanged });
    }
  }

  const removed = before.filter((p) => !nextIds.has(p.columns.id));

  return { created, updated, removed };
}
