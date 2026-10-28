import { createThreadHandler, listThreadsHandler } from "../ai-handlers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return listThreadsHandler(req, (await params).id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return createThreadHandler(req, (await params).id);
}
