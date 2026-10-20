import { Fragment, type ReactNode } from "react";
import Link from "next/link";

import { CALLOUT_KINDS, MENTION_TYPES } from "@/lib/constants/scenario";
import { mentionHref } from "@/lib/utils/scenario/mention-href";
import type { CalloutKind, MentionType, RichDoc, RichNode } from "@/types/scenario";

type Ctx = { campaignId: string; linkMentions: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");

const calloutKind = (v: unknown): CalloutKind => (CALLOUT_KINDS.includes(v as CalloutKind) ? (v as CalloutKind) : "event");

function withMarks(node: RichNode, inner: ReactNode): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((acc, mark) => {
    if (mark.type === "bold") return <strong>{acc}</strong>;

    if (mark.type === "italic") return <em>{acc}</em>;

    return <span className="secret">{acc}</span>;
  }, inner);
}

function Mention({ node, ctx }: { node: RichNode; ctx: Ctx }) {
  const type = node.attrs?.type as MentionType;

  const label = str(node.attrs?.label);

  const id = str(node.attrs?.id);

  if (ctx.linkMentions && id && MENTION_TYPES.includes(type)) {
    return (
      <Link className="mention" href={mentionHref(ctx.campaignId, type, id)}>
        {label}
      </Link>
    );
  }

  return <span className="mention">{label}</span>;
}

function children(node: RichNode, ctx: Ctx) {
  return (node.content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child, ctx)}</Fragment>);
}

function renderNode(node: RichNode, ctx: Ctx): ReactNode {
  switch (node.type) {
    case "text":
      return withMarks(node, node.text ?? "");
    case "hardBreak":
      return <br />;
    case "token":
      return withMarks(node, <span className={node.attrs?.color === "red" ? "r" : "g"} />);
    case "mention":
      return withMarks(node, <Mention node={node} ctx={ctx} />);
    case "paragraph":
      return <p>{children(node, ctx)}</p>;
    case "heading":
      return <h3>{children(node, ctx)}</h3>;
    case "say":
      return <p className="say">{children(node, ctx)}</p>;
    case "readAloud":
      return <div className="read">{children(node, ctx)}</div>;
    case "callout": {
      const kind = calloutKind(node.attrs?.kind);

      const tag = str(node.attrs?.tag);

      return (
        <div className={`mark ${kind}`}>
          {tag && <span className="tag">{tag}</span>}
          {children(node, ctx)}
        </div>
      );
    }

    case "bulletList":
      return <ul>{children(node, ctx)}</ul>;
    case "orderedList":
      return <ol>{children(node, ctx)}</ol>;
    case "listItem":
      return <li>{children(node, ctx)}</li>;
    case "table":
      return (
        <table>
          <tbody>{children(node, ctx)}</tbody>
        </table>
      );
    case "tableRow":
      return <tr>{children(node, ctx)}</tr>;
    case "tableCell":
      return <td>{children(node, ctx)}</td>;
    case "tableHeader":
      return <th>{children(node, ctx)}</th>;
    default:
      return children(node, ctx);
  }
}

export function ScenarioRichText({ doc, campaignId, linkMentions = false }: { doc: RichDoc; campaignId: string; linkMentions?: boolean }) {
  return <>{children({ type: "doc", content: doc.content }, { campaignId, linkMentions })}</>;
}
