"use client";

import { type ComponentProps, type ComponentType, Fragment, type MouseEvent } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ActionsMenuItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect?: (event: MouseEvent) => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface ActionsMenuProps {
  actions: ActionsMenuItem[];
  label?: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  iconClassName?: string;
  onTriggerClick?: (event: MouseEvent) => void;
  stopPropagation?: boolean;
}

export function ActionsMenu({
  actions,
  label,
  triggerSize = "icon",
  triggerClassName,
  iconClassName = "h-4 w-4",
  onTriggerClick,
  stopPropagation,
}: ActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={triggerSize}
          className={triggerClassName}
          aria-label={label}
          onClick={onTriggerClick}
        >
          <MoreVertical className={iconClassName} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map(({ label: itemLabel, icon: Icon, onSelect, href, destructive, disabled, separatorBefore }) => {
          const content = (
            <>
              <Icon className="mr-2 h-4 w-4" />
              {itemLabel}
            </>
          );

          return (
            <Fragment key={itemLabel}>
              {separatorBefore && <DropdownMenuSeparator />}
              {href ? (
                <DropdownMenuItem asChild variant={destructive ? "destructive" : undefined} disabled={disabled}>
                  <Link href={href}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant={destructive ? "destructive" : undefined}
                  disabled={disabled}
                  onClick={(e) => {
                    if (stopPropagation) e.stopPropagation();

                    onSelect?.(e);
                  }}
                >
                  {content}
                </DropdownMenuItem>
              )}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
