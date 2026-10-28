"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useCritChoiceDialog } from "@/lib/hooks/battle";
import type { CritTrigger } from "@/lib/utils/battle/crit-choice/types";

type Dialog = ReturnType<typeof useCritChoiceDialog>;

type Choice = number | "random";

const rowTitle = (t: CritTrigger, actor: string, target: string) =>
  t.source === "save" ? `Рятівний кидок: ${target}` : `${actor} → ${target}: ${t.kind === "success" ? "Критична удача" : "Критичний провал"}`;

export function CritChoiceDialog({ dialog }: { dialog: Dialog }) {
  return dialog.open ? <CritChoiceForm dialog={dialog} /> : null;
}

// відокремлено, щоб вибір скидався, коли діалог закривається
function CritChoiceForm({ dialog: { rows, submit, cancel, isSubmitting } }: { dialog: Dialog }) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const complete = rows.every((r) => choices[r.trigger.key] !== undefined);

  const randomAll = () => submit(Object.fromEntries(rows.map((r) => [r.trigger.key, "random" as const])));

  return (
    <ResponsiveDialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      hud
      title="Оберіть ефект критичного кидка"
      description="Дію зупинено, доки ви не оберете ефект."
      footer={
        <>
          <Button variant="ghost" disabled={isSubmitting} onClick={cancel}>Скасувати дію</Button>
          <Button variant="outline" disabled={isSubmitting} onClick={randomAll}>Випадково для всіх</Button>
          <Button type="submit" form="crit-choice-form" disabled={!complete || isSubmitting}>Підтвердити</Button>
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
              <Button type="button" size="sm" variant={choices[trigger.key] === "random" ? "default" : "outline"} onClick={() => setChoices({ ...choices, [trigger.key]: "random" })}>Випадково</Button>
            </legend>
            {options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-white/5">
                <input type="radio" name={trigger.key} className="mt-1" checked={choices[trigger.key] === o.id} onChange={() => setChoices({ ...choices, [trigger.key]: o.id })} />
                <span>
                  <b>{o.name}</b>
                  <span className="block text-[var(--hud-muted)]">{o.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </form>
    </ResponsiveDialog>
  );
}
