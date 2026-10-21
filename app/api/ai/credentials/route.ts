import { listCredentialsHandler } from "./credential-handlers";

export async function GET() {
  return listCredentialsHandler();
}
