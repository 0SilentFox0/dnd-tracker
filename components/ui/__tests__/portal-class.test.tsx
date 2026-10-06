// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Menu() {
  return (
    <Select open value="a">
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="a">Альфа</SelectItem></SelectContent>
    </Select>
  );
}

const content = () => document.body.querySelector('[data-slot="select-content"]');

afterEach(cleanup);

describe("HudPortalClassProvider", () => {
  it("adds the provided class to portalled select content", () => {
    render(<HudPortalClassProvider value="hud-surface"><Menu /></HudPortalClassProvider>);

    expect(content()?.className).toContain("hud-surface");
  });

  it("adds nothing without a provider", () => {
    render(<Menu />);

    expect(content()?.className).not.toContain("hud-surface");
  });
});
