import { cross, dot, len, norm, scale, sub, type Vec3 } from "./math";

import type { DieSides } from "@/types/battle";

export interface PolyFace {
  value: number;
  loop: number[];
  normal: Vec3;
  center: Vec3;
  up: Vec3;
}

export interface Polyhedron {
  sides: DieSides;
  vertices: Vec3[];
  faces: PolyFace[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

const EPS = 1e-6;

function signs(f: (a: number, b: number, c: number) => Vec3) {
  const out: Vec3[] = [];

  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) out.push(f(a, b, c));

  return out;
}

function trapezohedron10(): Vec3[] {
  const c = Math.cos(Math.PI / 5);

  const b = 0.105;

  // h makes every kite planar: apex, two neighbours and the far ring vertex coplanar
  const h = (b * (1 + c)) / (1 - c);

  const ring = Array.from({ length: 10 }, (_, i): Vec3 => [Math.cos((i * Math.PI) / 5), i % 2 === 0 ? -b : b, Math.sin((i * Math.PI) / 5)]);

  return [[0, h, 0], [0, -h, 0], ...ring];
}

function rawVertices(sides: DieSides): Vec3[] {
  switch (sides) {
    case 4:
      return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    case 6:
      return signs((a, b, c) => [a, b, c]);
    case 8:
      return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    case 10:
      return trapezohedron10();
    case 12:
      return [
        ...signs((a, b, c) => [a, b, c]),
        ...[-1, 1].flatMap((s) => [-1, 1].flatMap((t): Vec3[] => [[0, s / PHI, t * PHI], [s / PHI, t * PHI, 0], [s * PHI, 0, t / PHI]])),
      ];
    case 20:
      return [-1, 1].flatMap((s) => [-1, 1].flatMap((t): Vec3[] => [[0, s, t * PHI], [s, t * PHI, 0], [s * PHI, 0, t]]));
  }
}

// Faces of a convex vertex set: every plane through three vertices with all others behind it.
function hullFaces(vs: Vec3[]) {
  const seen = new Set<string>();

  const faces: { loop: number[]; normal: Vec3; center: Vec3 }[] = [];

  const n = vs.length;

  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const normal = norm(cross(sub(vs[j], vs[i]), sub(vs[k], vs[i])));

        if (!Number.isFinite(normal[0]) || len(normal) < 0.5) continue;

        const offset = dot(normal, vs[i]);

        const sign = offset >= 0 ? 1 : -1;

        const nn = scale(normal, sign);

        const off = offset * sign;

        const onPlane: number[] = [];

        let ok = true;

        for (let m = 0; m < n && ok; m++) {
          const d = dot(nn, vs[m]) - off;

          if (d > EPS) ok = false;
          else if (d > -EPS) onPlane.push(m);
        }

        const key = onPlane.join(",");

        if (!ok || onPlane.length < 3 || seen.has(key)) continue;

        seen.add(key);

        const center = scale(
          onPlane.reduce<Vec3>((acc, m) => [acc[0] + vs[m][0], acc[1] + vs[m][1], acc[2] + vs[m][2]], [0, 0, 0]),
          1 / onPlane.length,
        );

        const ref = norm(sub(vs[onPlane[0]], center));

        const tangent = cross(nn, ref);

        const angle = (m: number) => {
          const d = sub(vs[m], center);

          return Math.atan2(dot(d, tangent), dot(d, ref));
        };

        faces.push({ loop: [...onPlane].sort((a, b) => angle(a) - angle(b)), normal: nn, center });
      }

  return faces;
}

// Number's "up": towards a corner (or an edge middle on squares) so the digits sit upright in the polygon.
function faceUp(vs: Vec3[], loop: number[], normal: Vec3, center: Vec3): Vec3 {
  let target: Vec3;

  const edges = loop.map((m, i) => len(sub(vs[loop[(i + 1) % loop.length]], vs[m])));

  const square = loop.length === 4 && Math.max(...edges) - Math.min(...edges) < 1e-4;

  if (square) target = scale([vs[loop[0]][0] + vs[loop[1]][0], vs[loop[0]][1] + vs[loop[1]][1], vs[loop[0]][2] + vs[loop[1]][2]], 0.5);
  else if (loop.length === 4) target = vs[loop.reduce((best, m) => (Math.abs(vs[m][1]) > Math.abs(vs[best][1]) ? m : best), loop[0])];
  else target = vs[loop[0]];

  const d = sub(target, center);

  return norm(sub(d, scale(normal, dot(d, normal))));
}

// Opposite faces sum to sides + 1 like on real dice; d4 has none.
function assignValues(normals: Vec3[], sides: number) {
  const values = new Array<number>(normals.length).fill(0);

  let next = 1;

  for (let i = 0; i < normals.length; i++) {
    if (values[i]) continue;

    values[i] = next;

    if (sides !== 4) {
      let best = -1;

      let min = Infinity;

      normals.forEach((nm, j) => {
        if (values[j] || j === i) return;

        const d = dot(nm, normals[i]);

        if (d < min) {
          min = d;
          best = j;
        }
      });

      if (best >= 0) values[best] = sides + 1 - next;
    }

    next++;

    while (values.includes(next)) next++;
  }

  return values;
}

const cache = new Map<DieSides, Polyhedron>();

export function getPolyhedron(sides: DieSides): Polyhedron {
  const hit = cache.get(sides);

  if (hit) return hit;

  const raw = rawVertices(sides);

  const maxR = Math.max(...raw.map(len));

  const vertices = raw.map((v) => scale(v, 1 / maxR));

  const hull = hullFaces(vertices);

  if (hull.length !== sides) throw new Error(`d${sides}: expected ${sides} faces, got ${hull.length}`);

  const values = assignValues(
    hull.map((f) => f.normal),
    sides,
  );

  const faces = hull
    .map((f, i): PolyFace => ({ value: values[i], loop: f.loop, normal: f.normal, center: f.center, up: faceUp(vertices, f.loop, f.normal, f.center) }))
    .sort((a, b) => a.value - b.value);

  const poly = { sides, vertices, faces };

  cache.set(sides, poly);

  return poly;
}
