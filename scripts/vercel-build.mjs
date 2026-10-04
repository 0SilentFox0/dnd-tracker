/**
 * Build command для Vercel.
 * generate — з placeholder URL, бо CLI може висіти на TCP до pooler (див. docs/VERCEL.md).
 * migrate deploy — лише production з main: preview ділить ту саму БД і не має накатувати незмерджені міграції.
 * Production не з main (`vercel --prod` з гілки, CLI без git ref) падає, якщо не задано ALLOW_PROD_MIGRATE=1.
 */
import { execSync } from "node:child_process";
import { delimiter, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const MIGRATE_TIMEOUT_MS = 180_000;

const PRODUCTION_BRANCH = "main";

function isProduction(env) {
  return env.VERCEL_ENV === "production";
}

export function assertBuildEnv(env) {
  if (!isProduction(env)) {
    return;
  }

  const ref = env.VERCEL_GIT_COMMIT_REF;

  if (ref !== PRODUCTION_BRANCH && env.ALLOW_PROD_MIGRATE !== "1") {
    throw new Error(
      `Production-збірка з "${ref ?? "без git ref (CLI)"}", а не з ${PRODUCTION_BRANCH} — міграції цієї гілки потрапили б у прод-БД. ` +
        "Змерджи в main або явно задай ALLOW_PROD_MIGRATE=1.",
    );
  }

  if (!env.DIRECT_URL?.trim()) {
    throw new Error(
      "DIRECT_URL не задано для Production у Vercel — потрібен для prisma migrate deploy (порт 5432).",
    );
  }
}

export function buildSteps(env) {
  const steps = [
    { cmd: "prisma generate", env: { DATABASE_URL: PLACEHOLDER_DATABASE_URL } },
  ];

  if (isProduction(env)) {
    steps.push({ cmd: "prisma migrate deploy", timeoutMs: MIGRATE_TIMEOUT_MS });
  }

  steps.push({ cmd: "next build" });

  return steps;
}

function run() {
  assertBuildEnv(process.env);

  // `node scripts/…` не додає node_modules/.bin у PATH, на відміну від pnpm-скриптів
  const PATH = `${resolve("node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`;

  for (const step of buildSteps(process.env)) {
    console.info(`[vercel-build] ${step.cmd}`);
    execSync(step.cmd, {
      stdio: "inherit",
      env: { ...process.env, PATH, ...step.env },
      timeout: step.timeoutMs,
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run();
}
