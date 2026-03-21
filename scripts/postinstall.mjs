/**
 * На Vercel `pnpm install` не повинен ганяти `prisma generate` з реальним DATABASE_URL —
 * pooler (6543) може довго «висіти» на handshake. Generate виконується в buildCommand
 * з placeholder URL (див. vercel.json).
 */
import { execSync } from "node:child_process";

if (process.env.VERCEL) {
  process.exit(0);
}

execSync("prisma generate", { stdio: "inherit" });
