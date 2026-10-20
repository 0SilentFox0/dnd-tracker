"use client";

import { useScenarioPage, useScenarioPages } from "@/lib/hooks/scenario";
import type { RevealRule } from "@/types/scenario";

export function RevealSettings({ campaignId, rule, revealed, onChange, onToggleRevealed }: { campaignId: string; rule: RevealRule | undefined; revealed: boolean; onChange: (rule: RevealRule) => void; onToggleRevealed: () => void }) {
  const { data: pages = [] } = useScenarioPages(campaignId);

  const target = rule?.mode === "afterSection" ? rule : null;

  const { data: targetPage } = useScenarioPage(campaignId, target?.pageId ?? null);

  const scenes = pages.filter((p) => p.kind === "scene");

  return (
    <div className="sans" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, margin: "8px 0" }}>
      <select aria-label="Коли відкрити гравцеві" value={target ? "afterSection" : "manual"} onChange={(e) => onChange(e.target.value === "manual" ? { mode: "manual" } : { mode: "afterSection", pageId: scenes[0]?.id ?? "", sectionId: "" })}>
        <option value="manual">Вручну</option>
        <option value="afterSection" disabled={!scenes.length}>
          Після зіграного розділу
        </option>
      </select>
      {target && (
        <>
          <select aria-label="Сцена" value={target.pageId} onChange={(e) => onChange({ mode: "afterSection", pageId: e.target.value, sectionId: "" })}>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select aria-label="Розділ сцени" value={target.sectionId} onChange={(e) => onChange({ ...target, sectionId: e.target.value })}>
            <option value="">— оберіть розділ —</option>
            {targetPage?.content.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="button" className="toggle" aria-pressed={revealed} onClick={onToggleRevealed}>
        {revealed ? "✓ Відкрито гравцеві" : "Відкрити гравцеві зараз"}
      </button>
    </div>
  );
}
