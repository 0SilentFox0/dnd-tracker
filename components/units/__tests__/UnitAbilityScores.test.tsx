/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UnitAbilityScores } from "@/components/units/form/UnitAbilityScores";

describe("UnitAbilityScores", () => {
  afterEach(cleanup);

  it("підписує характеристики так само, як решта застосунку", () => {
    render(<UnitAbilityScores formData={{}} onChange={() => {}} />);

    expect(screen.getByLabelText("Статура")).toBeInTheDocument();
  });
});
