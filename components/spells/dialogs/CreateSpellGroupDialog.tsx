"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SPELL_NAME_MAX } from "@/lib/constants/spells";
import { useCreateSpellGroup } from "@/lib/hooks/spells";

interface CreateSpellGroupDialogProps {
  campaignId: string;
  onGroupCreated?: (groupId: string) => void;
}

export function CreateSpellGroupDialog({
  campaignId,
  onGroupCreated,
}: CreateSpellGroupDialogProps) {
  const t = useTranslations("spells.createGroup");

  const ta = useTranslations("common.actions");

  const router = useRouter();

  const createGroup = useCreateSpellGroup(campaignId);

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setError(null);
    createGroup.mutate(name.trim(), {
      onSuccess: (group) => {
        setOpen(false);
        setName("");
        router.refresh();
        onGroupCreated?.(group.id);
      },
      onError: (err) => setError(err instanceof Error ? err.message : t("failed")),
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="whitespace-nowrap">
          {t("trigger")}
        </Button>
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">{t("name")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholder")}
              required
              maxLength={SPELL_NAME_MAX}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName("");
                setError(null);
              }}
              disabled={createGroup.isPending}
            >
              {ta("cancel")}
            </Button>
            <Button type="submit" disabled={createGroup.isPending || !name.trim()}>
              {createGroup.isPending ? ta("creating") : t("submit")}
            </Button>
          </div>
        </form>
    </ResponsiveDialog>
    </>
  );
}
