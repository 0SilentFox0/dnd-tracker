import { ArrowDown, ArrowUp, X } from "lucide-react";

import { EditorCell } from "./EditorCell";

import { BRANCH_LEVEL_METAL, CIRCLE_METAL } from "@/components/hud";
import { Button } from "@/components/ui/button";
import type { CellRef, RawTree, TreeNodes } from "@/lib/utils/skills/progression";
import { BRANCH_LEVEL_LABEL, BRANCH_LEVELS, cellSkillId } from "@/lib/utils/skills/progression";

const COLUMNS: Array<{ circle: "outer" | "middle" | "inner"; index: number; title: string }> = [
  { circle: "outer", index: 0, title: "Зовнішнє 1" },
  { circle: "outer", index: 1, title: "Зовнішнє 2" },
  { circle: "outer", index: 2, title: "Зовнішнє 3" },
  { circle: "middle", index: 0, title: "Середнє 1" },
  { circle: "middle", index: 1, title: "Середнє 2" },
  { circle: "inner", index: 0, title: "Внутрішнє" },
];

export function EditorTable({ raw, tree, skillsById, errorIds, actions }: {
  raw: RawTree;
  tree: TreeNodes;
  skillsById: Map<string, { name: string; icon: string | null }>;
  errorIds: Set<string>;
  actions: { onCell: (ref: CellRef, label: string) => void; onMove: (branchId: string, dir: -1 | 1) => void; onRemove: (branchId: string, name: string) => void; onAddBranch: () => void };
}) {
  const cell = (ref: CellRef, label: string, metal: string) => {
    const id = cellSkillId(raw, ref);

    return <EditorCell label={label} skill={id ? (skillsById.get(id) ?? { name: id, icon: null }) : null} metal={metal} error={!!id && errorIds.has(id)} onClick={() => actions.onCell(ref, label)} />;
  };

  return (
    <div className="editor-scroll">
      <table className="editor-table">
        <thead>
          <tr>
            <th>Гілка</th>
            {BRANCH_LEVELS.map((l) => <th key={l}>{BRANCH_LEVEL_LABEL[l]}</th>)}
            {COLUMNS.map((c) => <th key={c.title}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="editor-branch">Раса <small>рівень 5 / 10 / 15</small></th>
            {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "racial", level: l }, `Раса · ${BRANCH_LEVEL_LABEL[l]}`, BRANCH_LEVEL_METAL[l])}</td>)}
            <td colSpan={COLUMNS.length} />
          </tr>
          {tree.branches.map((b, i) => (
            <tr key={b.id}>
              <th scope="row" className="editor-branch">
                <span>{b.name}</span>
                <span className="editor-branch-actions">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`${b.name} вище`} disabled={i === 0} onClick={() => actions.onMove(b.id, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`${b.name} нижче`} disabled={i === tree.branches.length - 1} onClick={() => actions.onMove(b.id, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Прибрати гілку ${b.name}`} onClick={() => actions.onRemove(b.id, b.name)}><X /></Button>
                </span>
              </th>
              {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "level", branchId: b.id, level: l }, `${b.name} · ${BRANCH_LEVEL_LABEL[l]}`, BRANCH_LEVEL_METAL[l])}</td>)}
              {COLUMNS.map((c) => <td key={c.title}>{cell({ kind: "slot", branchId: b.id, circle: c.circle, index: c.index }, `${b.name} · ${c.title}`, CIRCLE_METAL[c.circle])}</td>)}
            </tr>
          ))}
          <tr>
            <th scope="row" colSpan={1 + BRANCH_LEVELS.length + COLUMNS.length}>
              <Button type="button" variant="ghost" className="editor-add" onClick={actions.onAddBranch}>+ Додати гілку</Button>
            </th>
          </tr>
          <tr>
            <th scope="row" className="editor-branch">Ультимейт <small>після 3 внутрішніх</small></th>
            <td colSpan={3}>{cell({ kind: "ultimate" }, "Ультимейт", "metal-mithril")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
