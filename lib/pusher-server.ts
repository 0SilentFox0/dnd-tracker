import Pusher from "pusher";

import "server-only";
import { getPusherCluster } from "@/lib/pusher-config";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: getPusherCluster(),
  useTLS: true,
});
