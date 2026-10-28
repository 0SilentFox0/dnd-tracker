import { deleteCredentialHandler, patchCredentialHandler, saveCredentialHandler } from "../credential-handlers";

type Params = { params: Promise<{ provider: string }> };

export async function PUT(req: Request, { params }: Params) {
  return saveCredentialHandler(req, (await params).provider);
}

export async function PATCH(req: Request, { params }: Params) {
  return patchCredentialHandler(req, (await params).provider);
}

export async function DELETE(_req: Request, { params }: Params) {
  return deleteCredentialHandler((await params).provider);
}
