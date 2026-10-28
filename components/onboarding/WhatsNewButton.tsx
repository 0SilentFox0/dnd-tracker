"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useWhatsNew } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";

export function WhatsNewButton() {
  const t = useTranslator("whatsNew");

  const { entries, unseen, markSeen } = useWhatsNew();

  const [open, setOpen] = useState(false);

  // знімок при відкритті: після markSeen хук одразу поверне unseen = [], а мітки «нове» мають лишитися
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  const onOpenChange = (next: boolean) => {
    if (next) {
      setNewIds(new Set(unseen.map((e) => e.id)));
      markSeen();
    }

    setOpen(next);
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="relative h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong" onClick={() => onOpenChange(true)}>
        <Gift className="h-4 w-4" />
        <span className="sr-only">{t("ui.button")}</span>
        {unseen.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-hud-gold-strong px-1 text-[10px] leading-4 text-black">{unseen.length}</span>}
      </Button>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={t("ui.title")} hud>
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.id}>
              <p className="text-xs text-hud-muted">
                {e.date}
                {newIds.has(e.id) && t("ui.new")}
              </p>
              <p className="font-medium">{t(`${e.id}.title`)}</p>
              <p className="text-sm text-hud-muted">{t(`${e.id}.body`)}</p>
              {e.href && (
                <Link href={e.href} className="text-sm text-hud-gold hover:underline" onClick={() => setOpen(false)}>
                  {t("ui.open")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </ResponsiveDialog>
    </>
  );
}
