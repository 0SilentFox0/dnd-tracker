import { describe, expect, it } from "vitest";

import { isSecureRequest } from "../same-origin";

describe("isSecureRequest", () => {
  it.each([
    ["https://x/a", {}, true],
    ["http://x/a", { "x-forwarded-proto": "https" }, true],
    ["http://localhost/a", {}, false],
  ])("%s %j -> %s", (url, headers, expected) => {
    expect(isSecureRequest(new Request(url, { headers }))).toBe(expected);
  });
});
