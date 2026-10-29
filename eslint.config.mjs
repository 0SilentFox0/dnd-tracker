import { readFileSync } from "node:fs";
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

const THREE_RESTRICTED_PATH = { name: "three", message: "three лише в components/battle/fx/dice/scene.ts (лінивий чанк)" };

const THREE_IMPORT_PATTERN = { group: ["three/*"], message: THREE_RESTRICTED_PATH.message };

// next/font/google тягне шрифти з мережі під час збірки й ламає деплой
const GOOGLE_FONT_RESTRICTED_PATH = { name: "next/font/google", message: "Шрифти локальні: додайте файл у public/fonts і @font-face в app/fonts.css" };

const RESTRICTED_PATHS = [...DIALOG_RESTRICTED_PATHS, THREE_RESTRICTED_PATH, GOOGLE_FONT_RESTRICTED_PATH];

const API_IMPORT_PATTERN = {
  group: ["@/lib/api", "@/lib/api/*"],
  message: "Компоненти не ходять в API — використайте хук із @/lib/hooks/<domain>.",
};

const APP_IMPORT_PATTERN = {
  group: ["@/app", "@/app/*"],
  message: "lib не залежить від app: винесіть код у lib/server/<domain> і імпортуйте його з роутів.",
};

const DICE_SCENE_FILE = "components/battle/fx/dice/scene.ts";

const MODE_IMPORT_PATTERN = {
  group: ["@/lib/utils/battle/modes/maze*", "@/lib/hooks/battle/modes/maze*", "@/components/battle/modes/maze*"],
  message: "Режим карти — лише через реєстр (@/lib/utils/battle/modes, @/components/battle/modes).",
};

const MODE_OWNED_FILES = [
  "lib/utils/battle/modes/**",
  "lib/hooks/battle/modes/**",
  "components/battle/modes/**",
  "lib/server/battles/mutations/maze/**",
  "lib/server/battles/mutations/maze-mark/**",
  "lib/server/battles/mutations/move/**",
];

const DB_IMPORT_PATH = {
  name: "@/lib/db",
  message: "lib/utils — чиста логіка без БД: завантаження в lib/server/<domain> (ratchet-список DB_IN_UTILS_EXEMPT лише скорочується).",
};

const DB_IN_UTILS_EXEMPT = [
  "lib/utils/api/api-auth.ts",
  "lib/utils/battle/participant/{from-character-spell-slots,load-race,load-character-context,extract-skills,from-character-learned-spells}.ts",
  "lib/utils/battle/spell/load-spells-db.ts",
  "lib/utils/battle/balance/unit-library.ts",
  "lib/utils/battle/artifact-sets/load-maps.ts",
];

const I18N_EXEMPT = JSON.parse(readFileSync(new URL("./i18n-exempt.json", import.meta.url), "utf8"));

const CYRILLIC_MESSAGE = "Текст — у messages/*.json через t()";

const CYRILLIC_SELECTORS = ["Literal[value=/[\\u0400-\\u04FF]/]", "JSXText[value=/[\\u0400-\\u04FF]/]", "TemplateElement[value.raw=/[\\u0400-\\u04FF]/]"];

const eslintConfig = defineConfig([
  { ignores: [".superpowers/**"] },
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".claude/**", "**/dist/**", "**/*.gen.ts", ".next/**", "out/**", "build/**", "next-env.d.ts"],
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
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [DICE_SCENE_FILE],
    rules: {
      "no-restricted-imports": ["error", { paths: [THREE_RESTRICTED_PATH], patterns: [THREE_IMPORT_PATTERN] }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: RESTRICTED_PATHS,
          patterns: [MODE_IMPORT_PATTERN, THREE_IMPORT_PATTERN],
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
          paths: RESTRICTED_PATHS,
          patterns: [API_IMPORT_PATTERN, MODE_IMPORT_PATTERN, THREE_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: RESTRICTED_PATHS,
          patterns: [APP_IMPORT_PATTERN, MODE_IMPORT_PATTERN, THREE_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    files: ["lib/utils/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.{ts,tsx}", ...DB_IN_UTILS_EXEMPT, ...MODE_OWNED_FILES.filter((g) => g.startsWith("lib/utils"))],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [...RESTRICTED_PATHS, DB_IMPORT_PATH],
          patterns: [APP_IMPORT_PATTERN, MODE_IMPORT_PATTERN, THREE_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    files: [...MODE_OWNED_FILES.map((glob) => `${glob}/*.{ts,tsx}`), "**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: RESTRICTED_PATHS, patterns: [THREE_IMPORT_PATTERN] }],
    },
  },
  {
    files: ["components/battle/modes/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: RESTRICTED_PATHS,
          patterns: [API_IMPORT_PATTERN, THREE_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    files: [DICE_SCENE_FILE],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: DIALOG_RESTRICTED_PATHS,
          patterns: [API_IMPORT_PATTERN, MODE_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", ...I18N_EXEMPT],
    rules: {
      "no-restricted-syntax": ["error", ...CYRILLIC_SELECTORS.map((selector) => ({ selector, message: CYRILLIC_MESSAGE }))],
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
