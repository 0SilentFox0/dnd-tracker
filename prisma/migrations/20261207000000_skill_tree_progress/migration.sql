CREATE TABLE "skill_tree_progress" (
    "character_id" TEXT NOT NULL,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "skill_tree_progress_pkey" PRIMARY KEY ("character_id")
);

ALTER TABLE "skill_tree_progress" ADD CONSTRAINT "skill_tree_progress_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_tree_progress" ENABLE ROW LEVEL SECURITY;
