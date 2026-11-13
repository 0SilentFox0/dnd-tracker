# Ch16 simplify report

Fixed: shared MODULE_ID_RE (catalog.ts, used by schema.ts and schemas/campaigns.ts); one-expression sorted-unique modules in server rules.ts; moduleToggles computed once in useCampaignModules; module name computed once in SystemSection.
Skipped: composition() double presetsOf (pre-existing, outside diff); rest of diff clean.
Checks: prettier, eslint, test:related (1454 files pass), tsc clean.
