import { MAZE_MARK_COLORS } from "@/lib/constants/battle";

export function markColor(participantId: string): string {
  let hash = 0;

  for (const ch of participantId) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;

  return MAZE_MARK_COLORS[hash % MAZE_MARK_COLORS.length];
}
