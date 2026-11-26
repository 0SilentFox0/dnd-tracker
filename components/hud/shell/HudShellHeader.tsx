import { type ReactNode } from 'react';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function HudShellHeader({
    menu,
    breadcrumb,
    actions,
}: {
    menu?: { label: string; content: ReactNode };
    breadcrumb: ReactNode;
    actions: ReactNode;
}) {
    return (
        <header className="game-shell-header hud-surface sticky top-0 z-50 border-b border-hud-rule bg-hud-page/80 backdrop-blur-xl">
            <div className="game-shell-inner mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:gap-3">
                {menu && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={menu.label}
                                className="h-10 w-10 shrink-0 border-hud-rule text-hud-ink"
                            >
                                <Menu className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className="w-64 max-w-[calc(100vw-1.5rem)] p-2"
                        >
                            {menu.content}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {breadcrumb}
                <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2 [&_button]:min-h-10 [&_button]:min-w-10 [&_a]:min-h-10 [&_a]:min-w-10">
                    {actions}
                </div>
            </div>
        </header>
    );
}
