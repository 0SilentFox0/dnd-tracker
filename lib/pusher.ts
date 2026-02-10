import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

let clientInstance: PusherClient | null = null;

/**
 * Client-side Pusher — один інстанс на вкладку (singleton), щоб не створювати кілька з'єднань.
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  if (!clientInstance) {
    clientInstance = new PusherClient(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
    });
  }
  return clientInstance;
}
