"use client";

import { useMemo, useState } from "react";

import { AddBranchSheet } from "./AddBranchSheet";
import { EditorTable } from "./EditorTable";
import { SlotPicker } from "./SlotPicker";

import "@/components/hud/hud.css";
import "./editor.css";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { SelectField } from "@/components/ui/select-field";
import { useConfirm } from "@/lib/hooks/common";
import { useSkillTreeEditor } from "@/lib/hooks/skills";
import type { CellRef } from "@/lib/utils/skills/progression";
import { BRANCH_LEVEL_LABEL, cellSkillId, TREE_ERROR_TEXT } from "@/lib/utils/skills/progression";

const refLabel = (ref: CellRef, branchName: (id: string) => string) => {
  switch (ref.kind) {
    case "ultimate": return "Ультимейт";
    case "racial": return `Раса · ${BRANCH_LEVEL_LABEL[ref.level]}`;
    case "level": return `${branchName(ref.branchId)} · ${BRANCH_LEVEL_LABEL[ref.level]}`;
    case "slot": return `${branchName(ref.branchId)} · ${ref.circle === "outer" ? "З" : ref.circle === "middle" ? "С" : "В"}${ref.index + 1}`;
  }
};

export function SkillTreeEditor({ campaignId }: { campaignId: string }) {
  const { state, view, actions } = useSkillTreeEditor(campaignId);

  const confirm = useConfirm();

  const [picking, setPicking] = useState<{ ref: CellRef; label: string } | null>(null);

  const [adding, setAdding] = useState(false);

  const skillsById = useMemo(() => new Map(view.librarySkills.map((s) => [s.id, s])), [view.librarySkills]);

  const errorIds = useMemo(() => new Set(view.errors.map((e) => e.ref)), [view.errors]);

  const { raw, tree } = view;

  if (state.isLoading) return <LoadingState />;

  if (!raw || !tree) return <EmptyState title="Додайте расу, щоб налаштувати дерево" />;

  const branchName = (id: string) => tree.branches.find((b) => b.id === id)?.name ?? id;

  return (
    <div className={`${HUD_SURFACE} skill-tree-editor rounded-xl p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="hud-sc text-xl text-hud-ink">Дерево прокачки</span>
        <SelectField value={state.race ?? ""} onValueChange={(v) => void actions.setRace(v)} triggerClassName="w-40">
          {state.races.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
        </SelectField>
        {state.dirty && <span className="text-xs italic text-hud-gold">Незбережені зміни</span>}
        <span className="flex-1" />
        <Button variant="outline" onClick={actions.cancel} disabled={!state.dirty}>Скасувати</Button>
        <Button onClick={() => void actions.save()} disabled={!state.dirty || state.isSaving || view.errors.length > 0}>Зберегти</Button>
      </div>
      {view.errors.length > 0 && (
        <ul className="mb-3 text-sm text-hud-danger">
          {view.errors.map((e) => <li key={`${e.code}:${e.ref}`}>{TREE_ERROR_TEXT[e.code]}: {e.label ?? skillsById.get(e.ref)?.name ?? e.ref}</li>)}
        </ul>
      )}
      <EditorTable
        raw={raw}
        tree={tree}
        skillsById={skillsById}
        errorIds={errorIds}
        actions={{
          onCell: (ref, label) => setPicking({ ref, label }),
          onMove: actions.moveBranch,
          onRemove: async (branchId, name) => {
            if (await confirm({ title: `Прибрати гілку «${name}»?`, description: "Вивчені вузли цієї гілки в персонажів перестануть діяти.", confirmLabel: "Прибрати", destructive: true })) actions.removeBranch(branchId);
          },
          onAddBranch: () => setAdding(true),
        }}
      />
      <SlotPicker
        key={picking ? JSON.stringify(picking.ref) : "none"}
        target={picking}
        current={picking ? cellSkillId(raw, picking.ref) : null}
        skills={view.librarySkills}
        usedAt={(id) => {
          const at = view.locations.get(id)?.[0];

          return at ? refLabel(at, branchName) : null;
        }}
        onPick={(skillId) => {
          if (picking) actions.setCell(picking.ref, skillId);

          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <AddBranchSheet
        open={adding}
        branches={view.availableBranches}
        actions={{
          onClose: () => setAdding(false),
          onAdd: (id) => {
            actions.addBranch(id);
            setAdding(false);
          },
          onCreate: async (input) => {
            const ok = await actions.createBranch(input);

            if (ok) setAdding(false);

            return ok;
          },
        }}
      />
    </div>
  );
}
