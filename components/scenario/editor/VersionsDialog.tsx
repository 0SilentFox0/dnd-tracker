"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioVersions } from "@/lib/hooks/scenario";

const fmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" });

export function VersionsDialog({ campaignId, pageId, open, onOpenChange, onRestored }: { campaignId: string; pageId: string; open: boolean; onOpenChange: (o: boolean) => void; onRestored: () => void }) {
  const { versions, isLoading, restore, isRestoring } = useScenarioVersions(campaignId, pageId, open);

  const confirm = useConfirm();

  const pick = async (id: string, at: string) => {
    if (!(await confirm({ title: `Відновити версію від ${fmt.format(new Date(at))}?`, description: "Поточний стан збережеться як окрема версія.", confirmLabel: "Відновити" }))) return;

    await restore(id).catch(() => {});
    onRestored();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Версії сторінки">
      {isLoading && <p className="text-sm text-hud-muted">Завантаження…</p>}
      {!isLoading && versions.length === 0 && <p className="text-sm text-hud-muted">Версій ще немає — вони з&apos;являються не частіше ніж раз на 10 хвилин редагування.</p>}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3">
            <span>{fmt.format(new Date(v.createdAt))}</span>
            <Button size="sm" variant="outline" disabled={isRestoring} onClick={() => void pick(v.id, v.createdAt)}>
              Відновити
            </Button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  );
}
