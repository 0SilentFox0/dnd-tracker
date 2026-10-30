import { MENTION_TYPES } from "@/lib/constants/scenario";
import { isSecret } from "@/lib/utils/scenario/doc";
import type { IndexRef, MentionType, PageFacts, RichDoc, RichNode, ScenarioContent } from "@/types/scenario";

type Acc = Map<string, IndexRef>;

const isMentionType = (v: unknown): v is MentionType => (MENTION_TYPES as readonly unknown[]).includes(v);

function add(acc: Acc, type: MentionType, id: string, label: string, secret: boolean) {
  const key = `${type}:${id}`;

  const ref = acc.get(key);

  if (ref) {
    ref.count += 1;
    ref.secret = ref.secret && secret;

    if (!ref.label) ref.label = label;
  } else acc.set(key, { type, id, label, count: 1, secret });
}

function walk(node: RichNode, inherited: boolean, acc: Acc) {
  const secret = inherited || isSecret(node);

  if (node.type === "mention") {
    const { type, id, label } = node.attrs ?? {};

    if (isMentionType(type) && typeof id === "string" && id) add(acc, type, id, typeof label === "string" ? label : "", secret);
  }

  node.content?.forEach((child) => walk(child, secret, acc));
}

const walkDoc = (doc: RichDoc, acc: Acc) => doc.content.forEach((n) => walk(n, false, acc));

export function extractPageFacts(content: ScenarioContent): PageFacts {
  return {
    sections: content.sections.map((section) => {
      const acc: Acc = new Map();

      if (section.marker) add(acc, "marker", section.marker.markerId, "", false);

      for (const row of section.rows) {
        walkDoc(row.story, acc);
        walkDoc(row.notes, acc);

        if (row.battleId) add(acc, "battle", row.battleId, "", false);

        if (row.marker) add(acc, "marker", row.marker.markerId, "", false);
      }

      return { id: section.id, title: section.title, played: section.played, refs: [...acc.values()] };
    }),
  };
}
