import type { TrackKind } from "@/types/audio";

export const TRACK_GROUP_SEPARATOR = " - ";

export const OTHER_TRACK_GROUP = "Інше";

export interface PlaylistFilter {
  query: string;
  /** null — усі групи */
  group: string | null;
  kind: TrackKind | null;
}

export interface TrackGroup<T> {
  name: string;
  tracks: T[];
}

export const BATTLE_TRACK_GROUP = "Битва";

const BATTLE_TITLE = /^Битва(\s|$)/u;

const separatorAt = (title: string) => title.indexOf(TRACK_GROUP_SEPARATOR);

const isBattleTitle = (title: string) => {
  const at = separatorAt(title);

  return at > 0 && BATTLE_TITLE.test(title.slice(at + TRACK_GROUP_SEPARATOR.length).trim());
};

/** Група — частина назви до « - » («Люди - Місто» → «Люди»); усі «<раса> - Битва N» — в одній групі «Битва» */
export function trackGroupName(title: string): string {
  if (isBattleTitle(title)) return BATTLE_TRACK_GROUP;

  const at = separatorAt(title);

  const group = at > 0 ? title.slice(0, at).trim() : "";

  return group || OTHER_TRACK_GROUP;
}

/** Назва без префікса групи; у групі «Битва» префікс — раса, тож назва лишається повною */
export function trackLabelInGroup(title: string): string {
  const group = trackGroupName(title);

  if (group === OTHER_TRACK_GROUP || group === BATTLE_TRACK_GROUP) return title;

  return title.slice(separatorAt(title) + TRACK_GROUP_SEPARATOR.length).trim() || title;
}

/** Групи в порядку першої появи в бібліотеці, «Інше» — в кінці */
export function listTrackGroups(tracks: { title: string }[]): string[] {
  const names = [...new Set(tracks.map((t) => trackGroupName(t.title)))];

  return [...names.filter((n) => n !== OTHER_TRACK_GROUP), ...names.filter((n) => n === OTHER_TRACK_GROUP)];
}

const normalize = (s: string) => s.toLocaleLowerCase("uk").replace(/\s+/g, " ").trim();

export function filterTracks<T extends { title: string; kind: TrackKind }>(tracks: T[], filter: PlaylistFilter): T[] {
  const words = normalize(filter.query).split(" ").filter(Boolean);

  return tracks.filter((t) => {
    if (filter.kind && t.kind !== filter.kind) return false;

    if (filter.group && trackGroupName(t.title) !== filter.group) return false;

    const title = normalize(t.title);

    return words.every((w) => title.includes(w));
  });
}

export function groupTracks<T extends { title: string }>(tracks: T[]): TrackGroup<T>[] {
  const byName = new Map<string, T[]>();

  for (const t of tracks) {
    const name = trackGroupName(t.title);

    byName.set(name, [...(byName.get(name) ?? []), t]);
  }

  return listTrackGroups(tracks).map((name) => ({ name, tracks: byName.get(name) ?? [] }));
}
