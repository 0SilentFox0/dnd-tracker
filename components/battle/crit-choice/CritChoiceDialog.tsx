"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useCritChoiceDialog } from "@/lib/hooks/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { useText } from "@/lib/i18n/use-text";
import type { CritTrigger } from "@/lib/utils/battle/crit-choice/types";

type Dialog = ReturnType<typeof useCritChoiceDialog>;

type Choice = number | "random";

export function CritChoiceDialog({ dialog }: { dialog: Dialog }) {
  return dialog.open ? <CritChoiceForm dialog={dialog} /> : null;
}

// separate so the choice resets when the dialog closes
function CritChoiceForm({ dialog: { rows, submit, cancel, isSubmitting } }: { dialog: Dialog }) {
  const t = useTranslations("battle.critChoice");

  const text = useText();

  const rowTitle = (trigger: CritTrigger, actor: string, target: string) =>
    trigger.source === "save" ? t("saveRow", { target }) : t("attackRow", { actor, target, kind: t(`kinds.${trigger.kind}`) });

  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const complete = rows.every((r) => choices[r.trigger.key] !== undefined);

  const randomAll = () => submit(Object.fromEntries(rows.map((r) => [r.trigger.key, "random" as const])));

  return (
    <ResponsiveDialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      hud
      title={t("title")}
      description={t("description")}
      footer={
        <>
          <Button variant="ghost" disabled={isSubmitting} onClick={cancel}>{t("cancelAction")}</Button>
          <Button variant="outline" disabled={isSubmitting} onClick={randomAll}>{t("randomAll")}</Button>
          <Button type="submit" form="crit-choice-form" disabled={!complete || isSubmitting}>{t("confirm")}</Button>
        </>
      }
    >
      <form
        id="crit-choice-form"
        className="space-y-5 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(choices);
        }}
      >
        {rows.map(({ trigger, actorName, targetName, options }) => (
          <fieldset key={trigger.key} className="space-y-1">
            <legend className="mb-1 flex w-full items-center justify-between gap-2">
              <span className="font-semibold">{rowTitle(trigger, actorName, targetName)}</span>
              <Button type="button" size="sm" variant={choices[trigger.key] === "random" ? "default" : "outline"} onClick={() => setChoices({ ...choices, [trigger.key]: "random" })}>{t("random")}</Button>
            </legend>
            {options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-white/5">
                <input type="radio" name={trigger.key} className="mt-0.5" checked={choices[trigger.key] === o.id} onChange={() => setChoices({ ...choices, [trigger.key]: o.id })} />
                <span>
                  <b>{text(dynamicTextRef(`battleTerms.crits.${trigger.source}.${trigger.kind}.${o.id}.name`))}</b>
                  <span className="block text-[var(--hud-muted)]">{text(dynamicTextRef(`battleTerms.crits.${trigger.source}.${trigger.kind}.${o.id}.description`))}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </form>
    </ResponsiveDialog>
  );
}
