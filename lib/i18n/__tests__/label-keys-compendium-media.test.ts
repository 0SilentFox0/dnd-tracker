import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import type { MediaReason } from "@/types/compendium-import";

const REASONS: Record<MediaReason, true> = { MEDIA_INVALID_URL: true, MEDIA_HTTPS_ONLY: true, MEDIA_INTERNAL_PATH: true, MEDIA_LIMIT: true, MEDIA_EXTRA: true, MEDIA_NESTED: true, MEDIA_PRIVATE_HOST: true, MEDIA_DNS: true, MEDIA_TIMEOUT: true, MEDIA_TOO_LARGE: true, MEDIA_REDIRECTS: true, MEDIA_HTTP_STATUS: true, MEDIA_BAD_FORMAT: true, MEDIA_FETCH_FAILED: true, MEDIA_STORAGE_FAILED: true, MEDIA_TARGET_CUSTOMIZED: true, MEDIA_TARGET_GONE: true };

describe("compendium media reason keys", () => {
  expectLabelKeys("compendium", "import.media.reasons", Object.keys(REASONS));
});
