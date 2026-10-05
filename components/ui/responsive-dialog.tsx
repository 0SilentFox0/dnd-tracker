"use client";

import { createContext, type ReactNode, useContext } from "react";
import { Drawer } from "vaul";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/hooks/common/useIsMobile";
import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

const InsideSheet = createContext(false);

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, title, description, footer, size = "md", dismissible = true, className, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const nested = useContext(InsideSheet);

  const handleOpenChange = (next: boolean) => {
    if (!next && !dismissible) return;

    onOpenChange(next);
  };

  if (isMobile) {
    const Root = nested ? Drawer.NestedRoot : Drawer.Root;

    return (
      <Root open={open} onOpenChange={handleOpenChange} dismissible={dismissible}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Drawer.Content data-slot="sheet" className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-xl border-t bg-background outline-none", className)}>
            <div data-slot="sheet-handle" aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            <div className="space-y-1 px-4 pt-3 pb-2">
              <Drawer.Title className="text-lg font-semibold leading-tight">{title}</Drawer.Title>
              {description ? <Drawer.Description className="text-sm text-muted-foreground">{description}</Drawer.Description> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <InsideSheet.Provider value={true}>{children}</InsideSheet.Provider>
            </div>
            {footer ? (
              <div data-slot="sheet-footer" className="flex gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:flex-1">
                {footer}
              </div>
            ) : null}
          </Drawer.Content>
        </Drawer.Portal>
      </Root>
    );
  }

  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("flex flex-col overflow-hidden", SIZE_CLASS[size], className)}
        showCloseButton={dismissible}
        onEscapeKeyDown={block}
        onInteractOutside={block}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
