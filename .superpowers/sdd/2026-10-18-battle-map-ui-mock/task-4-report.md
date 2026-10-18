# Task 4 report: drop hex grid

Status: DONE. Removed GridShape and the `grid` field (constants, types, zod schema); geometry/layout/occupancy/path/placement/attack-reach/map-view lost the `grid` parameter; hex branches, toCube, HEX_* deleted. Playground grid toggle removed; hex tests removed (playground hook test now covers re-placement on cols change); spec updated to square-only (controller's FX section kept).
Checks: tsc clean, eslint 0 problems, vitest full run 448 files / 2689 tests pass, grep for hex/GridShape empty (except crypto digest("hex"), color-hex UI labels, unrelated words).
