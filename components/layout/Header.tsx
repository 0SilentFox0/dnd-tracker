"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Menu, Sparkles, User } from "lucide-react";

import { JoinBattleButton } from "@/components/campaigns/JoinBattleButton";
import { WatchShowButton } from "@/components/campaigns/WatchShowButton";
import { AbbreviationsInfoDialog } from "@/components/common/AbbreviationsInfoDialog";
import { HUD_SURFACE } from "@/components/hud";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { cn } from "@/lib/utils";

const BATTLE_PATH = /^\/campaigns\/[^/]+\/battles\/[^/]+$/;

export function Header({ email }: { email: string | null }) {
  const pathname = usePathname();

  const signOutForm = useRef<HTMLFormElement>(null);

  if (
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname === "/"
  ) {
    return null;
  }

  const campaignMatch = pathname?.match(/^\/campaigns\/([^/]+)/);

  const campaignId = campaignMatch?.[1];

  const isCampaignPage = !!campaignId;

  const isDMPage = pathname?.includes("/dm/") || false;

  const isPlayerPage = !isDMPage && isCampaignPage;

  const isBattlePage = BATTLE_PATH.test(pathname ?? "");

  const width = isBattlePage ? "w-full px-6" : "container mx-auto px-4";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-hud-rule bg-[#0b0908]/[.97]">
      <HudPortalClassProvider value={HUD_SURFACE}>
      <div className={cn(width, "flex h-14 items-center justify-between")}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong" asChild>
            <Link href="/campaigns">
              <Home className="h-4 w-4" />
              <span className="sr-only">На головну</span>
            </Link>
          </Button>

          {isCampaignPage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Меню кампанії</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href={`/campaigns/${campaignId}`}>
                    Огляд кампанії
                  </Link>
                </DropdownMenuItem>
                {isDMPage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/characters`}>
                        Персонажі
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/characters?type=npc_hero`}>
                        NPC Герої
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/units`}>
                        NPC Юніти
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/spells`}>
                        Заклинання
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/artifacts`}>
                        Артефакти
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>
                        Сети артефактів
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/battles`}>
                        Сцени Боїв
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/music`}>
                        Музика
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/scenario`}>
                        Сценарій
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/ai`}>
                        AI і API
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isPlayerPage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/character`}>
                        Мій персонаж
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <JoinBattleButton />
          <WatchShowButton />
          <AbbreviationsInfoDialog />
          {email && (
            <span className="hidden sm:inline text-sm text-hud-muted">
              {email}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong">
                <User className="h-4 w-4" />
                <span className="sr-only">Профіль</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {email && (
                <>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {email}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings/ai">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI-ключі
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => signOutForm.current?.requestSubmit()}>
                <LogOut className="h-4 w-4 mr-2" />
                Вийти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className={`${width} pb-2`}>
        <Breadcrumbs />
      </div>
      <form ref={signOutForm} action="/auth/signout" method="post" hidden />
      </HudPortalClassProvider>
    </header>
  );
}
