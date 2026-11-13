-- CreateTable
CREATE TABLE "enemies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "damage" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "min_time" INTEGER NOT NULL DEFAULT 0,
    "spawn_weight" INTEGER NOT NULL DEFAULT 0,
    "splits" INTEGER NOT NULL DEFAULT 0,
    "boss_order" INTEGER,

    CONSTRAINT "enemies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "drop_chance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enemies_boss_order_key" ON "enemies"("boss_order");

-- Values moved from the game frontend (content.ts / scene.ts)
INSERT INTO "enemies" ("id", "name", "icon", "color", "hp", "speed", "damage", "radius", "xp", "score", "min_time", "spawn_weight", "splits", "boss_order") VALUES
    ('bug', 'Bug', '🐛', '#7cff9b', 10, 62, 7, 15, 1, 10, 0, 100, 0, NULL),
    ('null', 'Null Pointer', '👻', '#9fd6ff', 7, 108, 6, 14, 1, 14, 35, 60, 0, NULL),
    ('crash', 'Kernel Panic', '💀', '#ff6b6b', 30, 72, 12, 18, 3, 30, 75, 45, 0, NULL),
    ('merge', 'Merge Conflict', '🔀', '#ff9f43', 40, 58, 11, 20, 4, 40, 110, 32, 2, NULL),
    ('deadline', 'Deadline', '⏰', '#ffd84d', 85, 52, 18, 24, 7, 75, 160, 24, 0, NULL),
    ('legacy', 'Legacy Code', '🗄️', '#b08968', 190, 40, 22, 30, 12, 140, 230, 16, 0, NULL),
    ('calc1', 'CALCULUS', '📝', '#ff4d6d', 900, 58, 30, 46, 90, 1500, 0, 0, 0, 1),
    ('calc2', 'LINEAR ALGEBRA', '📝', '#ff9f43', 1300, 60, 33, 48, 120, 2200, 0, 0, 0, 2),
    ('calc3', 'ELECTROMAGNETISM', '📝', '#ffd84d', 1700, 62, 35, 50, 150, 3000, 0, 0, 0, 3),
    ('thesis', 'THESIS DEFENSE', '🎓', '#c77dff', 2200, 64, 38, 54, 200, 4000, 0, 0, 0, 4);

INSERT INTO "pickups" ("id", "name", "value", "drop_chance") VALUES
    ('xp', 'XP Orb', 0, 1),
    ('heal', 'Free Pizza', 22, 0.012),
    ('magnet', 'Magnet', 0, 0.008),
    ('nuke', 'Nuke', 0, 0.001);
