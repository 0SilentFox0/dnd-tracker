export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <span className="hud-sc block text-[13px] tracking-[.06em] text-hud-ink">
            {children}
        </span>
    );
}
