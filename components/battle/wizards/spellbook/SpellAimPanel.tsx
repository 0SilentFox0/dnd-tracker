import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { btn, primaryBtn } from "../attack/shared";
import { MapAimPanel } from "../MapAimPanel";

import { Portrait } from "@/components/battle/hud";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Book = ReturnType<typeof useSpellBook>;

const footerBtn = "hud-sc h-10 min-w-0 flex-1 whitespace-nowrap border border-white/20 px-2 text-sm";

type AimT = ReturnType<typeof useTranslations<"battleWizards.spell.aim">>;

function hintOf({ state }: Book, tw: AimT): string {
  const pick = state.pick;

  if (pick?.targetMode === "template") return tw("template");

  if (pick?.chain) return tw("chain");

  if (pick?.targetMode === "multi") return pick.maxTargets !== undefined ? tw("multiMax", { count: state.targetIds.length, max: pick.maxTargets }) : tw("multi", { count: state.targetIds.length });

  return tw("single");
}

/** Поки гравець цілиться, книга закрита, а карта лишається клікабельною: шаблон — точка, решта — клік по токену. */
export function SpellAimPanel({ book, spellName }: { book: Book; spellName: string }) {
  const tw = useTranslations("battleWizards.spell.aim");

  const tc = useTranslations("common.actions");

  const { state, view, actions } = book;

  const hover = useSyncExternalStore(view.hover.subscribe, view.hover.get, () => null);

  const aimPreview = hover ? view.aimPreviewAt(hover) : null;

  const template = state.pick?.targetMode === "template";

  const confirmable = !template && (state.pick?.targetMode === "multi" || !!state.pick?.chain);

  const chosen = state.targetIds.flatMap((id) => view.targets.find((t) => t.basicInfo.id === id) ?? []);

  return (
    <MapAimPanel
      ariaLabel={tw("ariaLabel")}
      title={spellName}
      hint={hintOf(book, tw)}
      footer={
        <>
          <button type="button" onClick={actions.back} className={footerBtn}>← {tc("back")}</button>
          <button type="button" onClick={actions.close} className={footerBtn}>{tc("cancel")}</button>
          {confirmable && (
            <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(btn, primaryBtn, "h-10 min-w-0 flex-1 whitespace-nowrap px-2 text-sm disabled:opacity-50")}>{tw("next")}</button>
          )}
        </>
      }
    >
      {(slot) => {
        const list = cn("mt-2 space-y-1 overflow-y-auto", slot ? "max-h-[76px]" : "max-h-40");

        if (template) {
          return (
            aimPreview && (
              <ul aria-label={tw("hit")} className={list}>
                {aimPreview.targets.length === 0 && <li className="text-sm italic text-[var(--hud-muted)]">{tw("hitNone")}</li>}
                {aimPreview.targets.map(({ participant, ally }) => (
                  <li key={participant.basicInfo.id} className="flex h-9 items-center gap-2">
                    <Portrait participant={participant} size={24} />
                    <span className="hud-sc text-sm font-bold">{participant.basicInfo.name}</span>
                    {ally && <span className="ml-auto text-xs text-hud-gold-bright">{tw("ally")}</span>}
                  </li>
                ))}
              </ul>
            )
          );
        }

        return (
          chosen.length > 0 && (
            <ul aria-label={tw("chosen")} className={list}>
              {chosen.map((p, i) => (
                <li key={p.basicInfo.id} className="flex h-9 items-center gap-2">
                  <Portrait participant={p} size={24} />
                  <span className="hud-sc text-sm font-bold">{state.pick?.chain ? `${i + 1}. ` : ""}{p.basicInfo.name}</span>
                </li>
              ))}
            </ul>
          )
        );
      }}
    </MapAimPanel>
  );
}
