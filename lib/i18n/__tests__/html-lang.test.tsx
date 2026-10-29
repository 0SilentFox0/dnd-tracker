// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HtmlLang, resetHtmlLangForTests } from "../html-lang";

const lang = () => document.documentElement.lang;

beforeEach(() => {
  resetHtmlLangForTests();
  document.documentElement.removeAttribute("lang");
});

afterEach(cleanup);

describe("HtmlLang", () => {
  it("lock en over root uk -> en; unmounting the lock restores uk", () => {
    render(<HtmlLang locale="uk" />);

    const locked = render(<HtmlLang locale="en" lock />);

    expect(lang()).toBe("en");

    locked.unmount();

    expect(lang()).toBe("uk");
  });

  it("root changed under a lock applies after the lock is gone", () => {
    const root = render(<HtmlLang locale="uk" />);

    const locked = render(<HtmlLang locale="en" lock />);

    root.rerender(<HtmlLang locale="en" />);
    expect(lang()).toBe("en");

    locked.unmount();

    expect(lang()).toBe("en");
  });

  it("the top lock wins and the one below returns on unmount", () => {
    render(<HtmlLang locale="uk" />);

    const first = render(<HtmlLang locale="en" lock />);

    const second = render(<HtmlLang locale="uk" lock />);

    expect(lang()).toBe("uk");

    second.unmount();

    expect(lang()).toBe("en");

    first.unmount();

    expect(lang()).toBe("uk");
  });
});
