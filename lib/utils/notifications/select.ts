import type { MarkNotificationsReadData, NotificationType, PlayerNotification } from "@/types/notifications";

export function matchesRead(n: PlayerNotification, { types, refIds }: MarkNotificationsReadData): boolean {
  if (!types?.length && !refIds?.length) return false;

  return (!types?.length || types.includes(n.type)) && (!refIds?.length || refIds.includes(n.refId));
}

export function unreadOfTypes(list: PlayerNotification[] | undefined, types: readonly NotificationType[]): PlayerNotification[] {
  return (list ?? []).filter((n) => types.includes(n.type));
}

export function hasUnread(list: PlayerNotification[] | undefined, types: readonly NotificationType[]): boolean {
  return unreadOfTypes(list, types).length > 0;
}
