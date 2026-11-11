import * as fs from "fs";
import * as path from "path";

import { type Ruleset, RulesetSchema } from "@/lib/utils/rules/schema";

export const SRD_RULES: Ruleset = RulesetSchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/templates/srd-5.2/rules.json"), "utf8")));
