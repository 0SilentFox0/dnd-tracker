import { describe, expect, it } from "vitest";

import { landingRewriteTarget } from "../landing-rewrite";

describe("landingRewriteTarget", () => {
  it("rewrites / for the en cookie", () => {
    expect(landingRewriteTarget({ pathname: "/", cookie: "en" })).toBe("/en");
  });

  it("rewrites / by Accept-Language when there is no cookie", () => {
    expect(landingRewriteTarget({ pathname: "/", acceptLanguage: "en-US,en;q=0.9" })).toBe("/en");
  });

  it("keeps the cookie above Accept-Language", () => {
    expect(landingRewriteTarget({ pathname: "/", cookie: "uk", acceptLanguage: "en" })).toBeNull();
  });

  it("falls back to uk for junk and unknown languages", () => {
    expect(landingRewriteTarget({ pathname: "/", cookie: "fr", acceptLanguage: "de" })).toBeNull();
    expect(landingRewriteTarget({ pathname: "/", cookie: "", acceptLanguage: "*" })).toBeNull();
  });

  it("touches only the root path", () => {
    expect(landingRewriteTarget({ pathname: "/en", cookie: "en" })).toBeNull();
    expect(landingRewriteTarget({ pathname: "/sign-in", cookie: "en" })).toBeNull();
  });
});
