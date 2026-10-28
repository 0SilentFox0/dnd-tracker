import { NextResponse } from "next/server";

import "server-only";
import { attachmentHeaders } from "@/lib/utils/api/api-response";

export const csvResponse = (fileName: string, csv: string) => new NextResponse(csv, { headers: attachmentHeaders(fileName, "text/csv; charset=utf-8") });
