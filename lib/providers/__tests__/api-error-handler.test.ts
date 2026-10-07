// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleApiError, resetUnauthorizedRedirect } from "../api-error-handler";

const assign = vi.fn();

const payload = (status: number) => ({ status, message: "m", url: "/api/x" });

describe("handleApiError", () => {
  beforeEach(() => {
    assign.mockClear();
    resetUnauthorizedRedirect();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("location", { pathname: "/campaigns", assign });
  });

  it("401 веде на /sign-in один раз", () => {
    handleApiError(payload(401));
    handleApiError(payload(401));

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/sign-in");
  });

  it("на сторінці входу не редіректить", () => {
    vi.stubGlobal("location", { pathname: "/sign-in", assign });
    handleApiError(payload(401));

    expect(assign).not.toHaveBeenCalled();
  });

  it("інші статуси не редіректять", () => {
    handleApiError(payload(403));
    handleApiError(payload(500));

    expect(assign).not.toHaveBeenCalled();
  });
});
