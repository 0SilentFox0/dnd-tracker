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
  const editor = useSkillTreeEditor(campaignId);

  const confirm = useConfirm();

  const [picking, setPicking] = useState<{ ref: CellRef; label: string } | null>(null);

  const [adding, setAdding] = useState(false);

  const skillsById = useMemo(() => new Map(editor.librarySkills.map((s) => [s.id, s])), [editor.librarySkills]);

  const errorIds = useMemo(() => new Set(editor.errors.map((e) => e.ref)), [editor.errors]);

  const { raw, tree } = editor;

  if (editor.loading) return <LoadingState />;

  if (!raw || !tree) return <EmptyState title="Додайте расу, щоб налаштувати дерево" />;

  const branchName = (id: string) => tree.branches.find((b) => b.id === id)?.name ?? id;

  return (
    <div className={`${HUD_SURFACE} skill-tree-editor rounded-xl p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="hud-sc text-xl text-[#efe5d2]">Дерево прокачки</span>
        <SelectField value={editor.race ?? ""} onValueChange={(v) => void editor.setRace(v)} triggerClassName="w-40">
          {editor.races.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
        </SelectField>
        {editor.dirty && <span className="text-xs italic text-[#c9b37a]">Незбережені зміни</span>}
        <span className="flex-1" />
        <Button variant="outline" onClick={editor.actions.cancel} disabled={!editor.dirty}>Скасувати</Button>
        <Button onClick={() => void editor.actions.save()} disabled={!editor.dirty || editor.saving || editor.errors.length > 0}>Зберегти</Button>
      </div>
      {editor.errors.length > 0 && (
        <ul className="mb-3 text-sm text-[#d0705c]">
          {editor.errors.map((e) => <li key={`${e.code}:${e.ref}`}>{TREE_ERROR_TEXT[e.code]}: {e.label ?? skillsById.get(e.ref)?.name ?? e.ref}</li>)}
        </ul>
      )}
      <EditorTable
        raw={raw}
        tree={tree}
        skillsById={skillsById}
        errorIds={errorIds}
        actions={{
          onCell: (ref, label) => setPicking({ ref, label }),
          onMove: editor.actions.moveBranch,
          onRemove: async (branchId, name) => {
            if (await confirm({ title: `Прибрати гілку «${name}»?`, description: "Вивчені вузли цієї гілки в персонажів перестануть діяти.", confirmLabel: "Прибрати", destructive: true })) editor.actions.removeBranch(branchId);
          },
          onAddBranch: () => setAdding(true),
        }}
      />
      <SlotPicker
        key={picking ? JSON.stringify(picking.ref) : "none"}
        target={picking}
        current={picking ? cellSkillId(raw, picking.ref) : null}
        skills={editor.librarySkills}
        usedAt={(id) => {
          const at = editor.locations.get(id)?.[0];

          return at ? refLabel(at, branchName) : null;
        }}
        onPick={(skillId) => {
          if (picking) editor.actions.setCell(picking.ref, skillId);

          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <AddBranchSheet
        open={adding}
        branches={editor.availableBranches}
        actions={{
          onClose: () => setAdding(false),
          onAdd: (id) => {
            editor.actions.addBranch(id);
            setAdding(false);
          },
          onCreate: async (input) => {
            const ok = await editor.actions.createBranch(input);

            if (ok) setAdding(false);

            return ok;
          },
        }}
      />
    </div>
  );
}
