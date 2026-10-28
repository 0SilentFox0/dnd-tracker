export const NOTIFICATION_TYPES = ["level", "item", "spell", "acquaintance"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_RETENTION_DAYS = 30;

export const NOTIFICATIONS_LIST_LIMIT = 50;

export const NOTIFICATION_TILE_TYPES: Readonly<Record<string, readonly NotificationType[]>> = {
  "my-character": ["level", "item", "spell"],
  acquaintances: ["acquaintance"],
};
