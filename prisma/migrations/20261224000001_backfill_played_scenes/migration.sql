UPDATE "scenario_pages"
SET "status" = 'played', "playedAt" = COALESCE("playedAt", "updatedAt")
WHERE "kind" = 'scene'
  AND "status" <> 'played'
  AND jsonb_array_length(COALESCE("content"->'sections', '[]'::jsonb)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements("content"->'sections') AS section
    WHERE COALESCE((section->>'played')::boolean, false) = false
  );
