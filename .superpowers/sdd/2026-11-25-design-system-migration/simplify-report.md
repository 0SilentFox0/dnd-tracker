# Ch8 simplify report

Applied: removed redundant fragment in ProfileHeroCard; flattened redundant wrapper div around ops link in ProfileQuickSettings.
Checked, no action: PALETTE_SWATCHES and legacy palette i18n/CSS already removed; formatRelativeDays reused; empty-state/section cards are single-use shared components.
Ideas (not applied): ProfileEmptyState CTA link could reuse a shared Button-as-link variant; ProfileEditor/CharacterBasicInfo are large (rewritten, splitting is a bigger change).
Verification: tsc clean, cycles 0 SCC, app/profile + components/profile tests 15 passed.
