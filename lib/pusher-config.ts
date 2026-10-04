const DEFAULT_PUSHER_CLUSTER = "eu";

export function getPusherCluster(): string {
  return process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() || DEFAULT_PUSHER_CLUSTER;
}
