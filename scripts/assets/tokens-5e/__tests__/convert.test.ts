import sharp from "sharp";
import { expect, it } from "vitest";

import { toWebp } from "../convert";

it("resizes to a square webp under the budget", async () => {
  const png = await sharp({ create: { width: 768, height: 768, channels: 3, background: "#884422" } }).png().toBuffer();

  const out = await toWebp(png, 256);

  const meta = await sharp(out).metadata();

  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 256, 256]);
  expect(out.length).toBeLessThan(40 * 1024);
});
