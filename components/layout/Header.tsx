"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, ArrowLeft, Menu, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const handleGoBack = () => {
    router.back();
  };

  // Не показуємо хедер на сторінках авторизації
  if (
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname === "/"
  ) {
    return null;
  }

  // Визначаємо чи ми на сторінці кампанії
  const campaignMatch = pathname?.match(/^\/campaigns\/([^/]+)/);
  const campaignId = campaignMatch?.[1];
  const isCampaignPage = !!campaignId;
  const isDMPage = pathname?.includes("/dm/") || false;
  const isPlayerPage = !isDMPage && isCampaignPage;

  // Визначаємо чи можна повернутися назад (є історія)
  // Використовуємо mounted для уникнення проблем з гідрацією
  const canGoBack = mounted && typeof window !== "undefined" && window.history.length > 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Кнопка "На головну" */}
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Home className="h-4 w-4" />
              <span className="sr-only">На головну</span>
            </Button>
          </Link>

          {/* Кнопка "Назад" */}
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Назад</span>
            </Button>
          )}

          {/* Меню навігації для кампанії */}
          {isCampaignPage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
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
                      <Link href={`/campaigns/${campaignId}/dm/npc-heroes`}>
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
                      <Link href={`/campaigns/${campaignId}/dm/battles`}>
                        Сцени Боїв
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

        {/* Інформація про користувача та вихід */}
        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {userEmail}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-4 w-4" />
                <span className="sr-only">Профіль</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {userEmail && (
                <>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {userEmail}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Вийти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
