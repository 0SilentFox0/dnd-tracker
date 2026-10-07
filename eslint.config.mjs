import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import typescriptParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";

const DIALOG_RESTRICTED_PATHS = [
  { name: "@/components/ui/dialog", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
  { name: "@/components/ui/alert-dialog", message: "Використайте useConfirm з @/lib/hooks/common" },
  { name: "vaul", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["**/dist/**", "**/*.gen.ts", ".next/**", "out/**", "build/**", "next-env.d.ts"],
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefreshPlugin,
      "simple-import-sort": simpleImportSortPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettierConfig.rules,
      "react-hooks/exhaustive-deps": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "always",
        },
      ],
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/no-restricted-types": "warn",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            [
              "^react", // Packages. `react` related packages come first.
              "^next", // Next.js imports
              "^@?\\w", // Things that start with a letter or `@` followed by a letter.
            ],
            [
              // Absolute imports and Relative imports.
              "^(utils|services|hooks|types|pages|gql|components|layouts|styles|app-constants|lib|types)(/.*|$)",
              "^\\.\\.(?!/?$)", // Parent imports.
              "^\\.\\./?$", // Same-folder imports.
              "^\\./(?=.*/)(?!/?$)",
              "^\\.(?!/?$)",
              "^\\./?$",
              "^\\.",
            ],
            // CSS and assets imports
            ["^.+\\.gql$", "^.+\\.svg$", "^.+\\.s?css$", "^[^.]"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      "block-spacing": "error",
      "no-console": [
        "warn",
        {
          allow: ["info", "warn", "error"],
        },
      ],
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: ["const", "let", "var", "if", "class", "function", "block"],
          next: ["*"],
        },
        {
          blankLine: "always",
          prev: ["*"],
          next: ["const", "let", "var", "if", "class", "function", "block", "return"],
        },
      ],
      "import/no-cycle": [2, { maxDepth: 1 }],
      "react/jsx-key": "warn",
    },
  },
  {
    files: ["*.gen.ts"],
    rules: {},
  },
  {
    files: ["scripts/**/*.ts", "app/api/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: DIALOG_RESTRICTED_PATHS,
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Використайте useConfirm з @/lib/hooks/common" },
        { name: "alert", message: "Використайте useNotify з @/lib/hooks/common" },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "confirm", message: "Використайте useConfirm з @/lib/hooks/common" },
        { object: "window", property: "alert", message: "Використайте useNotify з @/lib/hooks/common" },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**", "components/ui/**", "**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: DIALOG_RESTRICTED_PATHS,
          patterns: [
            {
              group: ["@/lib/api", "@/lib/api/*"],
              message: "Компоненти не ходять в API — використайте хук із @/lib/hooks/<domain>.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "react/no-unescaped-entities": "warn",
      "react-hooks/static-components": "off", // Вимикаємо для компонентів, які повертають посилання на існуючі компоненти
    },
  },
]);

export default eslintConfig;
