import { OptimizedImage } from "@/components/common/OptimizedImage";

export function EditorCell({ label, skill, metal, error, onClick }: { label: string; skill: { name: string; icon: string | null } | null; metal: string; error: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`editor-cell ${skill ? "" : "empty"} ${error ? "error" : ""}`}>
      {skill ? (
        <>
          <span className={`editor-icon ${metal}`}>{skill.icon ? <OptimizedImage src={skill.icon} alt="" width={40} height={40} className="h-full w-full object-cover" fallback={<span>?</span>} /> : <span className="hud-sc">{skill.name[0]}</span>}</span>
          <span className="editor-name">{skill.name}</span>
        </>
      ) : (
        <span aria-hidden>+</span>
      )}
    </button>
  );
}
