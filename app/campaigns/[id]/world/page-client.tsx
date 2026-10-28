"use client";

import { WorldPlayClient } from "@/components/world/play/WorldPlayClient";

export function WorldPageClient(props: { campaignId: string; campaignName: string; mapId: string | null }) {
  return <WorldPlayClient key={props.mapId ?? "none"} {...props} />;
}
