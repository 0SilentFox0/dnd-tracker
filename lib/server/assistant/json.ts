import type { ActionResult } from "./types";

import "server-only";
import { jsonContent } from "@/lib/utils/common/json";

export const actionResult = (domain: string, name: string) => (data: unknown, id: string): ActionResult => ({ data: jsonContent(data), affected: [{ domain, id, name }], warnings: [] });
