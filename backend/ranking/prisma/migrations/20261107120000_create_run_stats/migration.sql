-- CreateTable
CREATE TABLE "run_stats" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "level_reached" INTEGER NOT NULL,
    "survived_time" INTEGER NOT NULL,
    "coins_earned" INTEGER NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "run_stats_run_id_key" ON "run_stats"("run_id");

-- CreateIndex
CREATE INDEX "run_stats_user_id_idx" ON "run_stats"("user_id");
