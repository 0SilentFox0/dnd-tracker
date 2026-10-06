import { buildTreeJson, normalizeTree } from "..";

export const RAW = buildTreeJson({
  id: "json-tree",
  race: "Ельф",
  branches: [
    { id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b", advanced: "atk-a", expert: "atk-e" }, outer: ["o1", "o2", "o3"], middle: ["m1", "m2"], inner: ["i1"] },
    { id: "defense", name: "Захист", color: "blue", levels: { basic: "def-b" }, outer: ["d-o1", "d-o2"], middle: ["d-m1"], inner: ["d-i1"] },
    { id: "light", name: "Світло", color: "gold", spellGroupId: "sg-light", outer: ["l-o1"], middle: [], inner: ["l-i1"] },
    { id: "chaos", name: "Хаос", color: "purple", outer: ["c-o1"], middle: ["c-m1"], inner: ["c-i1"] },
  ],
  racial: { basic: "r-b", advanced: "r-a" },
  ultimate: "ult",
});

export const TREE = normalizeTree({ id: "row-tree", race: "Ельф", skills: RAW });

export const lvl = (branch: string, level: "basic" | "advanced" | "expert") => `${branch}_${level}_level`;
