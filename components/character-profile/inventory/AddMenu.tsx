import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface AddMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDM: boolean;
  on: { grant: () => void; item: () => void };
}

export function AddMenu({ open, onOpenChange, isDM, on }: AddMenuProps) {
  const t = useTranslations("inventory.add");

  return (
    <ResponsiveDialog hud size="sm" open={open} onOpenChange={onOpenChange} title={t("title")}>
      <div className="flex flex-col gap-2">
        {isDM && (
          <Button variant="outline" onClick={on.grant}>
            {t("grant")}
          </Button>
        )}
        <Button variant="outline" onClick={on.item}>
          {t("item")}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
