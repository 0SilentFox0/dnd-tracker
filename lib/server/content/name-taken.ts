interface NameWhere {
  campaignId: string;
  name: { equals: string; mode: "insensitive" };
  id?: { not: string };
}

export async function nameTaken(find: (where: NameWhere) => Promise<unknown>, campaignId: string, name: string, exceptId?: string): Promise<boolean> {
  const clash = await find({ campaignId, name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) });

  return clash !== null;
}
