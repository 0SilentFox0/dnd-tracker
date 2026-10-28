import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { PuzzleCommand, ShowCommand, ShowResponse, ShowSnapshot } from "@/types/show";

export const getShow = (campaignId: string): Promise<ShowSnapshot> => withClock((onResponse) => campaignGet<ShowResponse>(campaignId, "/show", { cache: "no-store", onResponse }));

export const sendShow = (campaignId: string, cmd: ShowCommand): Promise<ShowSnapshot> => withClock((onResponse) => campaignPost<ShowResponse>(campaignId, "/show", cmd, { onResponse }));

export const sendPuzzle = (campaignId: string, cmd: PuzzleCommand): Promise<ShowSnapshot> => withClock((onResponse) => campaignPost<ShowResponse>(campaignId, "/show/puzzle", cmd, { onResponse }));
