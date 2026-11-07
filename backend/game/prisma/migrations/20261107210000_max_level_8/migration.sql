-- Weapons and passive items now go up to level 8 (frontend/game/src/game/content.ts)
UPDATE "weapons" SET "max_level" = 8;

UPDATE "passive_items" SET "max_level" = 8;
