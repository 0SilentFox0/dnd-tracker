import { trackGroupName } from "./playlist-groups";

export function moveTrack(ids: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;

  if (index < 0 || to < 0 || to >= ids.length) return ids;

  const next = [...ids];

  [next[index], next[to]] = [next[to], next[index]];

  return next;
}

/** Міняє трек місцями з найближчим сусідом тієї ж групи в потрібний бік; немає сусіда — null */
export function moveTrackInGroup(tracks: { id: string; title: string }[], id: string, dir: -1 | 1): string[] | null {
  const ids = tracks.map((t) => t.id);

  const from = ids.indexOf(id);

  if (from < 0) return null;

  const group = trackGroupName(tracks[from].title);

  for (let to = from + dir; to >= 0 && to < tracks.length; to += dir) {
    if (trackGroupName(tracks[to].title) === group) {
      [ids[from], ids[to]] = [ids[to], ids[from]];

      return ids;
    }
  }

  return null;
}
