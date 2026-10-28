"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gem, Sparkles, TrendingUp, UserRound } from "lucide-react";

import { ToastHost } from "@/components/common/ToastHost";
import type { NotificationType } from "@/lib/constants/notifications";
import { useToasts } from "@/lib/hooks/common";
import { useNotifications, useNotificationsSync } from "@/lib/hooks/notifications";

const TOASTED_KEY = "notifications-toasted";

const ICONS = {
  level: <TrendingUp className="size-5" />,
  item: <Gem className="size-5" />,
  spell: <Sparkles className="size-5" />,
  acquaintance: <UserRound className="size-5" />,
} satisfies Record<NotificationType, React.ReactNode>;

function readToasted(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(TOASTED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeToasted(ids: Set<string>): void {
  try {
    sessionStorage.setItem(TOASTED_KEY, JSON.stringify([...ids]));
  } catch {
    // storage blocked: toasts may repeat within the session
  }
}

export function NotificationsHost({ campaignId, userId }: { campaignId: string; userId: string | null }) {
  const t = useTranslations("common");

  const pathname = usePathname();

  const { toasts, push, dismiss } = useToasts();

  useNotificationsSync(campaignId, userId);

  const { data } = useNotifications(campaignId, { enabled: !!userId });

  const onBattle = pathname.includes("/battles/");

  useEffect(() => {
    if (!data?.length || onBattle) return;

    const toasted = readToasted();

    const fresh = data.filter((n) => !toasted.has(n.id));

    if (!fresh.length) return;

    for (const n of fresh) {
      toasted.add(n.id);
      push({ id: n.id, icon: ICONS[n.type], text: t(`notifications.${n.type}`), href: n.href });
    }

    writeToasted(toasted);
  }, [data, onBattle, push, t]);

  return onBattle ? null : <ToastHost toasts={toasts} onDismiss={dismiss} />;
}
