-- run_stats: follow the planned model (no level / finish date, planned column names)
ALTER TABLE "run_stats" DROP COLUMN "finished_at",
DROP COLUMN "level_reached";

ALTER TABLE "run_stats" RENAME COLUMN "kills" TO "enemies_killed";

ALTER TABLE "run_stats" RENAME COLUMN "coins_earned" TO "coins_collected";

-- CreateTable
CREATE TABLE "general_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_runs" INTEGER NOT NULL,
    "total_wins" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "best_score" INTEGER NOT NULL,
    "best_character_id" TEXT NOT NULL,
    "total_enemies_killed" INTEGER NOT NULL,
    "total_survived_time" INTEGER NOT NULL,
    "best_survived_time" INTEGER NOT NULL,
    "total_coins_collected" INTEGER NOT NULL,
    "last_run_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "general_stats_user_id_key" ON "general_stats"("user_id");

-- CreateIndex
CREATE INDEX "general_stats_best_score_idx" ON "general_stats"("best_score");

-- totals of the runs already recorded
INSERT INTO "general_stats" (
    "id", "user_id", "total_runs", "total_wins", "total_score", "best_score",
    "best_character_id", "total_enemies_killed", "total_survived_time",
    "best_survived_time", "total_coins_collected", "last_run_at"
)
SELECT
    gen_random_uuid()::text,
    "user_id",
    COUNT(*),
    COUNT(*) FILTER (WHERE "won"),
    SUM("score"),
    MAX("score"),
    (ARRAY_AGG("character_id" ORDER BY "score" DESC))[1],
    SUM("enemies_killed"),
    SUM("survived_time"),
    MAX("survived_time"),
    SUM("coins_collected"),
    MAX("created_at")
FROM "run_stats"
GROUP BY "user_id";

-- AddForeignKey
ALTER TABLE "run_stats" ADD CONSTRAINT "run_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "general_stats"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
