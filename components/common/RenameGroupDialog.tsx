"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface RenameGroupDialogProps {
  groupName: string;
  dialog: { open: boolean; onOpenChange: (open: boolean) => void };
  rename: {
    value: string;
    onChange: (name: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isPending: boolean;
  };
}

export function RenameGroupDialog({ groupName, dialog, rename }: RenameGroupDialogProps) {
  const t = useTranslations("common.renameGroup");

  const { value, onChange, onConfirm, onCancel, isPending } = rename;

  return (
    <ResponsiveDialog
      hud
      open={dialog.open}
      onOpenChange={dialog.onOpenChange}
      title={t("title")}
      description={t("description", { name: groupName })}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="groupName">{t("label")}</Label>
          <Input
            id="groupName"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
