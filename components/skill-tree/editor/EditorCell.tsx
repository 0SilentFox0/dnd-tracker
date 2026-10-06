import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";

export function EditorCell({ label, skill, metal, error, onClick }: { label: string; skill: { name: string; icon: string | null } | null; metal: string; error: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" aria-label={label} onClick={onClick} className={`editor-cell h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent justify-start ${skill ? "" : "empty"} ${error ? "error" : ""}`}>
      {skill ? (
        <>
          <span className={`editor-icon ${metal}`}>{skill.icon ? <OptimizedImage src={skill.icon} alt="" width={40} height={40} className="h-full w-full object-cover" fallback={<span>?</span>} /> : <span className="hud-sc">{skill.name[0]}</span>}</span>
          <span className="editor-name">{skill.name}</span>
        </>
      ) : (
        <span aria-hidden>+</span>
      )}
    </Button>
  );
}
