import type { NotificationType } from "@/lib/constants/notifications";

export function notificationHref(campaignId: string, type: NotificationType, refId: string): string {
  const base = `/campaigns/${campaignId}`;

  switch (type) {
    case "level":
      return `${base}/character`;
    case "item":
      return `${base}/character?tab=items`;
    case "spell":
      return `${base}/character?tab=magic`;
    case "acquaintance":
      return `${base}/acquaintances?focus=${encodeURIComponent(refId)}`;
  }
}
