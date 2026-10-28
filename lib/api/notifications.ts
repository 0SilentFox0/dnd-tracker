import { campaignGet, campaignPost } from "./client";

import type { MarkNotificationsReadData, PlayerNotification } from "@/types/notifications";

export const getNotifications = (campaignId: string) => campaignGet<PlayerNotification[]>(campaignId, "/notifications");

export const markNotificationsRead = (campaignId: string, data: MarkNotificationsReadData) =>
  campaignPost<{ count: number }>(campaignId, "/notifications/read", data);
