import { contentExampleUrl, contentExportUrl } from "@/lib/api/content-import";
import type { ImportKind } from "@/types/content-import";

export const useContentTransferUrls = (campaignId: string, kind: ImportKind) => ({ example: contentExampleUrl(campaignId, kind), export: contentExportUrl(campaignId, kind) });
