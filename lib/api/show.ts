import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { ShowCommand, ShowResponse, ShowSnapshot } from "@/types/show";

const toSnapshot = ({ body, clockOffsetMs }: { body: ShowResponse; clockOffsetMs: number | null }): ShowSnapshot => ({ show: body.show, clockOffsetMs });

export async function getShow(campaignId: string): Promise<ShowSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignGet<ShowResponse>(campaignId, "/show", { cache: "no-store", onResponse })));
}

export async function sendShow(campaignId: string, cmd: ShowCommand): Promise<ShowSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignPost<ShowResponse>(campaignId, "/show", cmd, { onResponse })));
}
