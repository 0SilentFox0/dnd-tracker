ALTER TABLE "battle_scenes" ADD COLUMN "owner_user_id" TEXT;
ALTER TABLE "battle_scenes" ADD COLUMN "source_battle_id" TEXT;

CREATE UNIQUE INDEX "battle_scenes_owner_user_id_source_battle_id_key" ON "battle_scenes"("owner_user_id", "source_battle_id");
