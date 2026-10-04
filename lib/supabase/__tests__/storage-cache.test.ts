import { describe, expect, it } from "vitest";

import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";

describe("staticAssetUploadOptions", () => {
  it("кешує статичні іконки на рік і перезаписує наявні", () => {
    expect(staticAssetUploadOptions("image/png")).toEqual({
      contentType: "image/png",
      upsert: true,
      cacheControl: "31536000",
    });
  });
});
