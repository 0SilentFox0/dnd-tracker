import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { choiceIssue } from "@/lib/utils/characters/choices/validate";

describe("choiceIssue", () => {
  it("carries the detail as a param, keeping the message a bare error key", () => {
    expect(choiceIssue("feats.0", "FEAT_TYPE", "Alert")).toEqual({ path: "feats.0", code: "FEAT_TYPE", message: API_ERRORS.FEAT_TYPE, params: { detail: "Alert" } });
  });

  it("has no params without a detail", () => {
    expect(choiceIssue("feats", "DM_FEAT_ONLY_DM")).toEqual({ path: "feats", code: "DM_FEAT_ONLY_DM", message: API_ERRORS.DM_FEAT_ONLY_DM });
  });
});
