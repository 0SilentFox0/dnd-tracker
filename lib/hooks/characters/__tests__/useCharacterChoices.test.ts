import { describe, expect, it } from "vitest";

import { ApiError, bodyErrorMessage } from "@/lib/api/client";
import { choiceSaveError } from "@/lib/hooks/characters/useCharacterChoices";

const body = { error: "Цю рису не можна взяти двічі: Alert", issues: [{ path: ["backgroundFeatPicks"], pathLabel: "Alert", message: "Цю рису не можна взяти двічі: Alert" }] };

describe("choiceSaveError", () => {
  it("keeps the banner short when the issues are already shown next to the pickers", () => {
    const error = new ApiError(bodyErrorMessage(body, "x"), 422, "/u", body);

    expect(error.message).toContain("Alert: Цю рису");
    expect(choiceSaveError(error, "fallback")).toBe("Цю рису не можна взяти двічі: Alert");
  });

  it("uses the full message when there are no issues, and the fallback for non-API errors", () => {
    expect(choiceSaveError(new ApiError("Не вдалося", 500, "/u", { error: "Не вдалося" }), "fallback")).toBe("Не вдалося");
    expect(choiceSaveError("boom", "fallback")).toBe("fallback");
  });
});
