import { describe, expect, it } from "vitest";

import { landingRewriteTarget } from "../landing-rewrite";

describe("landingRewriteTarget", () => {
  it("rewrites / for the uk cookie", () => {
    expect(landingRewriteTarget({ pathname: "/", cookie: "uk" })).toBe("/uk");
  });

  it("rewrites / by Accept-Language when there is no cookie", () => {
    expect(landingRewriteTarget({ pathname: "/", acceptLanguage: "uk-UA,uk;q=0.9,en;q=0.8" })).toBe("/uk");
  });

  it("keeps the cookie above Accept-Language", () => {
    expect(landingRewriteTarget({ pathname: "/", cookie: "en", acceptLanguage: "uk" })).toBeNull();
  });

  it("leaves / English without an explicit preference", () => {
    expect(landingRewriteTarget({ pathname: "/" })).toBeNull();
    expect(landingRewriteTarget({ pathname: "/", cookie: "fr", acceptLanguage: "de" })).toBeNull();
    expect(landingRewriteTarget({ pathname: "/", cookie: "", acceptLanguage: "*" })).toBeNull();
  });

  it("touches only the root path", () => {
    expect(landingRewriteTarget({ pathname: "/uk", cookie: "en" })).toBeNull();
    expect(landingRewriteTarget({ pathname: "/sign-in", cookie: "uk" })).toBeNull();
  });
});
