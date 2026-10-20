import { BATTLE_TRACK_GROUP, TRACK_GROUP_SEPARATOR } from "./playlist-groups";

export interface BattleTrackRef {
  id: string;
  title: string;
}

export interface BattleTitleChange {
  id: string;
  from: string;
  to: string;
}

const BATTLE_TITLE = new RegExp(`^(.+?)${TRACK_GROUP_SEPARATOR}${BATTLE_TRACK_GROUP}(?:\\s+\\d+)?(?:\\s+(\\(.+\\)))?$`, "u");

/** «<Раса> - Битва», «… Битва 2», «… Битва (альфа-версія)» → раса і примітка в дужках */
export function parseBattleTitle(title: string): { faction: string; note: string | null } | null {
  const m = BATTLE_TITLE.exec(title.trim());

  return m ? { faction: m[1].trim(), note: m[2] ?? null } : null;
}

export function battleTrackTitle(faction: string, n: number | null, note: string | null): string {
  return [`${faction}${TRACK_GROUP_SEPARATOR}${BATTLE_TRACK_GROUP}`, n, note].filter(Boolean).join(" ");
}

/** Нумерація «<Раса> - Битва N» за порядком бібліотеки (номер лише коли в раси кілька битв); ідемпотентно */
export function planBattleTitles(tracks: BattleTrackRef[]): BattleTitleChange[] {
  const byFaction = new Map<string, { id: string; title: string; note: string | null }[]>();

  for (const t of tracks) {
    const parsed = parseBattleTitle(t.title);

    if (parsed) byFaction.set(parsed.faction, [...(byFaction.get(parsed.faction) ?? []), { id: t.id, title: t.title, note: parsed.note }]);
  }

  return [...byFaction].flatMap(([faction, list]) =>
    list.flatMap((t, i) => {
      const to = battleTrackTitle(faction, list.length > 1 ? i + 1 : null, t.note);

      return to === t.title ? [] : [{ id: t.id, from: t.title, to }];
    }),
  );
}
