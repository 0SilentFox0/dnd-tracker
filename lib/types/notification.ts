/**
 * Типи для системи нотифікацій
 */

export enum NotificationType {
  SUCCESS = "success",
  ERROR = "error",
  INFO = "info",
}

export interface Notification {
  type: NotificationType;
  message: string;
}
