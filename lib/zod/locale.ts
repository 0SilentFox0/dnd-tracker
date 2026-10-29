import { z } from "zod";

import { zodErrorMap } from "@/lib/i18n/zod-errors";

z.config({ customError: zodErrorMap });
