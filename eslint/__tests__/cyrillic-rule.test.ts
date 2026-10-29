import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const root = path.resolve(__dirname, "../..");

const eslint = new ESLint({ cwd: root, overrideConfigFile: path.join(root, "eslint.config.mjs") });

async function cyrillicErrors(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });

  return result.messages.filter((m) => m.ruleId === "no-restricted-syntax");
}

const jsx = 'export const X = () => <p>Привіт</p>;\n';

const literal = 'export const a = "Привіт";\n';

const template = "export const b = (x: string) => `Привіт ${x}`;\n";

vi.setConfig({ testTimeout: 60_000 });

describe("cyrillic ratchet", () => {
  it.each([
    ["JSX text", jsx],
    ["string literal", literal],
    ["template literal", template],
  ])("flags %s in a component", async (_name, code) => {
    expect(await cyrillicErrors("components/auth/x.tsx", code)).toHaveLength(1);
  });

  it("flags all three kinds together", async () => {
    expect(await cyrillicErrors("components/auth/x.tsx", jsx + literal + template)).toHaveLength(3);
  });

  it("allows a documented disable", async () => {
    const code = '// eslint-disable-next-line no-restricted-syntax -- native language name\nexport const a = "Українська";\n';

    expect(await cyrillicErrors("components/auth/x.tsx", code)).toHaveLength(0);
  });

  it("flags any non-exempt source file", async () => {
    expect(await cyrillicErrors("lib/utils/x.ts", literal)).toHaveLength(1);
  });

  it("ignores exempt paths (scripts, data, import aliases)", async () => {
    expect(await cyrillicErrors("scripts/x.tsx", jsx)).toHaveLength(0);
    expect(await cyrillicErrors("data/library/x.ts", literal)).toHaveLength(0);
    expect(await cyrillicErrors("lib/constants/import-aliases.ts", literal)).toHaveLength(0);
  });

  it("ignores __tests__ in migrated directories", async () => {
    expect(await cyrillicErrors("components/auth/__tests__/x.tsx", jsx)).toHaveLength(0);
  });

  it("covers app/page.tsx and the locale switcher", async () => {
    expect(await cyrillicErrors("app/page.tsx", literal)).toHaveLength(1);
    expect(await cyrillicErrors("components/common/LocaleSwitcher.tsx", literal)).toHaveLength(1);
  });
});
