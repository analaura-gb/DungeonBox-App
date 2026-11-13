-- The ranking now lists runs (a player can appear more than once),
-- so the character of each player's best run is no longer needed.
ALTER TABLE "general_stats" DROP COLUMN "best_character_id";

-- CreateIndex
CREATE INDEX "run_stats_score_idx" ON "run_stats"("score");
