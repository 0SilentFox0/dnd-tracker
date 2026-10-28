import { describe, expect, it } from "vitest";

import { draftMessages, extractCyrillic } from "../extract-cyrillic";

const source = `
// коментар ігнорується
const a = "Привіт";
const b = \`Вітаю, \${name}!\`;
const c = "plain";
export const X = () => <p title="Назва">Текст <b>жирний</b></p>;
`;

describe("extractCyrillic", () => {
  const found = extractCyrillic(source, "components/auth/Foo.tsx");

  it("finds strings, templates, JSX text and attributes with their lines", () => {
    expect(found.map((f) => [f.line, f.text])).toEqual([
      [3, "Привіт"],
      [4, "Вітаю, ${…}!"],
      [6, "Назва"],
      [6, "Текст"],
      [6, "жирний"],
    ]);
  });

  it("drafts keys from the file name with an ordinal suffix", () => {
    expect(draftMessages(found)).toEqual({ foo: { "1": "Привіт", "2": "Вітаю, ${…}!", "3": "Назва", "4": "Текст", "5": "жирний" } });
  });
});
