import type { NotificationType } from "@/lib/constants/notifications";

export type { NotificationType };

export interface PlayerNotification {
  id: string;
  type: NotificationType;
  refId: string;
  href: string;
  createdAt: string;
}

export interface MarkNotificationsReadData {
  types?: NotificationType[];
  refIds?: string[];
}

export interface NotificationsChangedEvent {
  campaignId: string;
}
