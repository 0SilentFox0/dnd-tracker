"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { Drawer } from "vaul";

import { HUD_SURFACE } from "@/components/hud";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PortalContainerProvider } from "@/components/ui/portal-container";
import { useIsMobile } from "@/lib/hooks/common/useIsMobile";
import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

const InsideSheet = createContext(false);

const LAYOUT_TOKEN = /^(sm:|md:|lg:|fixed$|absolute$|inset-|top-|bottom-|left-|right-|-?translate-|w-|max-w-|max-h-|min-h-|overflow-)/;

// callers style the desktop modal; the sheet keeps only colours/borders
const sheetClasses = (className?: string) => className?.split(/\s+/).filter((t) => t && !LAYOUT_TOKEN.test(t)).join(" ");

// plain max-w-* must beat the sm:max-w-* size class at ≥640px
const desktopClasses = (className?: string) => className?.split(/\s+/).map((t) => (/^max-w-/.test(t) ? `sm:${t}` : t)).join(" ");

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  dismissible?: boolean;
  className?: string;
  hud?: boolean;
  children?: ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, title, description, footer, size = "md", dismissible = true, className, hud = false, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const nested = useContext(InsideSheet);

  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  const hudClass = hud ? `${HUD_SURFACE} hud-form-page` : undefined;

  const body = hud ? <PortalContainerProvider value={contentEl}>{children}</PortalContainerProvider> : children;

  const handleOpenChange = (next: boolean) => {
    if (!next && !dismissible) return;

    onOpenChange(next);
  };

  if (isMobile) {
    const Root = nested ? Drawer.NestedRoot : Drawer.Root;

    return (
      <Root open={open} onOpenChange={handleOpenChange} dismissible={dismissible}>
        <Drawer.Portal>
          {/* the closing overlay and sheet stay mounted for the exit animation; let taps through to the page */}
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:pointer-events-none!" />
          <Drawer.Content ref={setContentEl} data-slot="sheet" className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-xl border-t bg-background outline-none data-[state=closed]:pointer-events-none!", hudClass, sheetClasses(className))}>
            <div data-slot="sheet-handle" aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            <div className="space-y-1 px-4 pt-3 pb-2">
              <Drawer.Title className="text-lg font-semibold leading-tight">{title}</Drawer.Title>
              {description ? <Drawer.Description className="text-sm text-muted-foreground">{description}</Drawer.Description> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <InsideSheet.Provider value={true}>{body}</InsideSheet.Provider>
            </div>
            {footer ? (
              <div data-slot="sheet-footer" className={cn("flex gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:flex-1", hud && "border-[#3a2e22] bg-[#110e0b]/95")}>
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
        ref={setContentEl}
        className={cn("flex flex-col overflow-hidden", SIZE_CLASS[size], hudClass, desktopClasses(className))}
        showCloseButton={dismissible}
        onEscapeKeyDown={block}
        onInteractOutside={block}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{body}</div>
        {footer ? <DialogFooter className={cn(hud && "border-[#3a2e22] bg-[#110e0b]/95")}>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
