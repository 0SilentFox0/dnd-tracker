import { useState } from "react";

import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { CellRef } from "@/lib/utils/skills/progression";

type LibrarySkill = { id: string; name: string; icon: string | null; mainSkillId: string | null; summary: string[] };

export function SlotPicker({ target, current, skills, usedAt, onPick, onClose }: {
  target: { ref: CellRef; label: string } | null;
  current: string | null;
  skills: LibrarySkill[];
  usedAt: (skillId: string) => string | null;
  onPick: (skillId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const [all, setAll] = useState(false);

  const [selected, setSelected] = useState<string | null>(current);

  if (!target) return null;

  const { ref } = target;

  const byScope = (s: LibrarySkill) => {
    if (all || ref.kind === "ultimate") return true;

    if (ref.kind === "racial") return !s.mainSkillId;

    return s.mainSkillId === ref.branchId;
  };

  const list = skills.filter(byScope).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={target.label}
      className={HUD_SURFACE}
      footer={
        <>
          <Button variant="outline" onClick={() => onPick(null)} disabled={!current}>Прибрати</Button>
          <Button onClick={() => selected && onPick(selected)} disabled={!selected || selected === current}>Поставити</Button>
        </>
      }
    >
      <input className="mb-2 h-9 w-full border border-[#4a4036] bg-transparent px-2" placeholder="Пошук…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> усі скіли</label>
      <ul role="listbox" aria-label="Скіли бібліотеки" className="max-h-80 overflow-y-auto">
        {list.map((s) => {
          const used = s.id !== current ? usedAt(s.id) : null;

          return (
            <li key={s.id} role="option" aria-selected={selected === s.id} aria-disabled={used ? "true" : "false"} onClick={() => !used && setSelected(s.id)} className={`picker-item ${selected === s.id ? "on" : ""} ${used ? "used" : ""}`}>
              <span className="font-medium">{s.name}</span>
              {s.summary.length > 0 && <span className="block text-xs opacity-70">{s.summary.join(" · ")}</span>}
              {used && <span className="text-[11px] text-[#b07842]">вже в {used}</span>}
            </li>
          );
        })}
      </ul>
    </ResponsiveDialog>
  );
}
