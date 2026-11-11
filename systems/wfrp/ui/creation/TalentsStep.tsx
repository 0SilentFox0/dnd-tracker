"use client";

import { useTranslations } from "next-intl";

import type { WfrpDraftFormState } from "./types";

import { Button } from "@/components/ui/button";

export function TalentsStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.talents");

  const { fixed, count, rolled, roll, names } = form.talents;

  return (
    <div className="space-y-4">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("fixed")}</h3>
        {fixed.length ? (
          <ul className="grid gap-2">
            {fixed.map((id) => (
              <li key={id} className="min-h-11 rounded-lg border border-hud-line px-3 py-2 text-sm">
                {names(id)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-hud-muted">{t("noneFixed")}</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("random", { count })}</h3>
        {count === 0 ? (
          <p className="text-sm text-hud-muted">{t("noRandom")}</p>
        ) : (
          <>
            {rolled.length === 0 && (
              <>
                <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={roll}>
                  {t("roll")}
                </Button>
                <p className="text-sm text-hud-muted">{t("rollFirst")}</p>
              </>
            )}
            <ul className="grid gap-2">
              {rolled.map((id, i) => (
                <li key={`${id}-${i}`} className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1 text-sm">
                  <span className="min-w-0 flex-1">{form.shown(`talent${i}`, names(id))}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
