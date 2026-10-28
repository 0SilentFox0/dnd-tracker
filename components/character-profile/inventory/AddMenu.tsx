import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface AddMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDM: boolean;
  on: { grant: () => void; item: () => void };
}

export function AddMenu({ open, onOpenChange, isDM, on }: AddMenuProps) {
  return (
    <ResponsiveDialog hud size="sm" open={open} onOpenChange={onOpenChange} title="Додати">
      <div className="flex flex-col gap-2">
        {isDM && (
          <Button variant="outline" onClick={on.grant}>
            Видати артефакт
          </Button>
        )}
        <Button variant="outline" onClick={on.item}>
          Додати предмет
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
