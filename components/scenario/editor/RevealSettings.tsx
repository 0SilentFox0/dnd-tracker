"use client";

import { useState } from "react";

import { SelectField } from "@/components/ui/select-field";
import { useScenarioPage, useScenarioPages } from "@/lib/hooks/scenario";
import type { RevealRule } from "@/types/scenario";

type Mode = "manual" | "afterSection";

const MODE_OPTIONS = [
  { value: "manual", label: "Вручну" },
  { value: "afterSection", label: "Після зіграного розділу" },
];

export function RevealSettings({ campaignId, rule, revealed, onChange, onToggleRevealed }: { campaignId: string; rule: RevealRule | undefined; revealed: boolean; onChange: (rule: RevealRule) => void; onToggleRevealed: () => void }) {
  const { data: pages = [] } = useScenarioPages(campaignId);

  const [local, setLocal] = useState<{ mode: Mode; pageId: string }>({ mode: rule?.mode === "afterSection" ? "afterSection" : "manual", pageId: rule?.mode === "afterSection" ? rule.pageId : "" });

  const scenes = pages.filter((p) => p.kind === "scene");

  const pageId = local.pageId || scenes[0]?.id || "";

  const sectionId = rule?.mode === "afterSection" && rule.pageId === pageId ? rule.sectionId : "";

  const { data: targetPage } = useScenarioPage(campaignId, local.mode === "afterSection" ? pageId || null : null);

  const changeMode = (mode: Mode) => {
    setLocal((l) => ({ ...l, mode }));

    if (mode === "manual") onChange({ mode: "manual" });
  };

  const changeScene = (next: string) => {
    setLocal({ mode: "afterSection", pageId: next });
    onChange({ mode: "manual" });
  };

  return (
    <div className="sans" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, margin: "8px 0" }}>
      <SelectField
        aria-label="Коли відкрити гравцеві"
        value={local.mode}
        onValueChange={(v) => changeMode(v as Mode)}
        options={scenes.length ? MODE_OPTIONS : MODE_OPTIONS.map((o) => ({ ...o, disabled: o.value === "afterSection" }))}
        className="w-auto min-w-48"
      />
      {local.mode === "afterSection" && (
        <>
          <SelectField aria-label="Сцена" value={pageId} onValueChange={changeScene} options={scenes.map((s) => ({ value: s.id, label: s.title }))} placeholder="Сцена" className="w-auto min-w-40" />
          <SelectField
            aria-label="Розділ сцени"
            value={sectionId}
            onValueChange={(v) => onChange({ mode: "afterSection", pageId, sectionId: v })}
            options={(targetPage?.content.sections ?? []).map((s) => ({ value: s.id, label: s.title }))}
            placeholder="— оберіть розділ —"
            className="w-auto min-w-40"
          />
        </>
      )}
      <button type="button" className="toggle" aria-pressed={revealed} onClick={onToggleRevealed}>
        {revealed ? "✓ Відкрито гравцеві" : "Відкрити гравцеві зараз"}
      </button>
    </div>
  );
}
