import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, X } from "lucide-react";

import { EditorCell } from "./EditorCell";

import { BRANCH_LEVEL_METAL, CIRCLE_METAL } from "@/components/hud";
import { Button } from "@/components/ui/button";
import type { CellRef, RawTree, TreeNodes } from "@/lib/utils/skills/progression";
import { BRANCH_LEVELS, cellSkillId } from "@/lib/utils/skills/progression";

const COLUMNS: Array<{ circle: "outer" | "middle" | "inner"; index: number }> = [
  { circle: "outer", index: 0 },
  { circle: "outer", index: 1 },
  { circle: "outer", index: 2 },
  { circle: "middle", index: 0 },
  { circle: "middle", index: 1 },
  { circle: "inner", index: 0 },
];

export function EditorTable({ raw, tree, skillsById, errorIds, actions }: {
  raw: RawTree;
  tree: TreeNodes;
  skillsById: Map<string, { name: string; icon: string | null }>;
  errorIds: Set<string>;
  actions: { onCell: (ref: CellRef, label: string) => void; onMove: (branchId: string, dir: -1 | 1) => void; onRemove: (branchId: string, name: string) => void; onAddBranch: () => void };
}) {
  const t = useTranslations("skillTree");

  const tier = (level: (typeof BRANCH_LEVELS)[number]) => t(`tiers.${level}`);

  const columnTitle = (c: (typeof COLUMNS)[number]) => t(`editor.columns.${c.circle}`, { n: c.index + 1 });

  const cell = (ref: CellRef, label: string, metal: string) => {
    const id = cellSkillId(raw, ref);

    return <EditorCell label={label} skill={id ? (skillsById.get(id) ?? { name: id, icon: null }) : null} metal={metal} error={!!id && errorIds.has(id)} onClick={() => actions.onCell(ref, label)} />;
  };

  return (
    <div className="editor-scroll">
      <table className="editor-table">
        <thead>
          <tr>
            <th>{t("editor.branch")}</th>
            {BRANCH_LEVELS.map((l) => <th key={l}>{tier(l)}</th>)}
            {COLUMNS.map((c) => <th key={columnTitle(c)}>{columnTitle(c)}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="editor-branch">{t("editor.racial")} <small>{t("editor.racialLevels")}</small></th>
            {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "racial", level: l }, t("cells.racial", { tier: tier(l) }), BRANCH_LEVEL_METAL[l])}</td>)}
            <td colSpan={COLUMNS.length} />
          </tr>
          {tree.branches.map((b, i) => (
            <tr key={b.id}>
              <th scope="row" className="editor-branch">
                <span>{b.name}</span>
                <span className="editor-branch-actions">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("editor.moveUp", { name: b.name })} disabled={i === 0} onClick={() => actions.onMove(b.id, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("editor.moveDown", { name: b.name })} disabled={i === tree.branches.length - 1} onClick={() => actions.onMove(b.id, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("editor.removeBranch", { name: b.name })} onClick={() => actions.onRemove(b.id, b.name)}><X /></Button>
                </span>
              </th>
              {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "level", branchId: b.id, level: l }, t("cells.level", { branch: b.name, tier: tier(l) }), BRANCH_LEVEL_METAL[l])}</td>)}
              {COLUMNS.map((c) => <td key={columnTitle(c)}>{cell({ kind: "slot", branchId: b.id, circle: c.circle, index: c.index }, t("cells.column", { branch: b.name, column: columnTitle(c) }), CIRCLE_METAL[c.circle])}</td>)}
            </tr>
          ))}
          <tr>
            <th scope="row" colSpan={1 + BRANCH_LEVELS.length + COLUMNS.length}>
              <Button type="button" variant="ghost" className="editor-add" onClick={actions.onAddBranch}>{t("editor.addBranch")}</Button>
            </th>
          </tr>
          <tr>
            <th scope="row" className="editor-branch">{t("editor.ultimate")} <small>{t("editor.ultimateHint")}</small></th>
            <td colSpan={3}>{cell({ kind: "ultimate" }, t("cells.ultimate"), "metal-mithril")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
