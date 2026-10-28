// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { FormAlert } from "@/components/common/states";

afterEach(cleanup);

it("renders an alert", () => {
  render(<FormAlert>Помилка</FormAlert>);
  expect(screen.getByRole("alert").textContent).toBe("Помилка");
});
