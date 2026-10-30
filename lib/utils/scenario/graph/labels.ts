import { GRAPH_SCENE_H, GRAPH_SCENE_W } from "@/lib/constants/scenario-graph";
import type { PositionedNode } from "@/lib/utils/scenario/graph/layout";

const CHAR_W = 6.4;

const LABEL_H = 15;

const LABEL_MAX = 26;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function pickLabels(nodes: readonly PositionedNode[], forced: ReadonlySet<string>): Set<string> {
  const taken: Box[] = nodes.filter((n) => n.kind === "scene").map((n) => ({ x0: n.x - GRAPH_SCENE_W / 2, x1: n.x + GRAPH_SCENE_W / 2, y0: n.y - GRAPH_SCENE_H / 2, y1: n.y + GRAPH_SCENE_H / 2 }));

  const shown = new Set<string>();

  const order = nodes
    .filter((n) => n.kind === "entity")
    .sort((a, b) => Number(forced.has(b.id)) - Number(forced.has(a.id)) || b.degree - a.degree || a.label.localeCompare(b.label));

  for (const n of order) {
    const w = Math.min(n.label.length, LABEL_MAX) * CHAR_W + 6;

    const top = n.y + 16 + Math.min(n.degree, 8) + 3;

    const box = { x0: n.x - w / 2, x1: n.x + w / 2, y0: top, y1: top + LABEL_H };

    if (!forced.has(n.id) && taken.some((t) => overlaps(t, box))) continue;

    taken.push(box);
    shown.add(n.id);
  }

  return shown;
}
