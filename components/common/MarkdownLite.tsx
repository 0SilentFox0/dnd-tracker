import { parseMarkdownLite } from "@/lib/utils/text/markdown-lite";

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parseMarkdownLite(text).map((block, i) =>
        block.kind === "text" ? (
          <p key={i} className="whitespace-pre-line">
            {block.text}
          </p>
        ) : (
          <div key={i} className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  {block.header.map((h, k) => (
                    <th key={k} className="border-b border-hud-line/60 px-2 py-1 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="odd:bg-hud-line/10">
                    {row.map((c, k) => (
                      <td key={k} className="px-2 py-1">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
