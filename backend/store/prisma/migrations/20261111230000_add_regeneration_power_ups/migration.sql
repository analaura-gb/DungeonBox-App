-- AlterTable
ALTER TABLE "power_ups" ADD COLUMN     "regeneration" DOUBLE PRECISION NOT NULL DEFAULT 0;

INSERT INTO "power_ups" ("id", "name", "price", "attack", "defense", "health", "movement_speed", "attack_speed", "projectile_speed", "projectile_size", "regeneration", "image_url", "required_power_up_id", "updated_at") VALUES
    ('drink-1', 'Energy Drink I', 200, 0, 0, 0, 1, 1, 1, 1, 0.2, '/assets/catalog/energy-drink.png', NULL, CURRENT_TIMESTAMP),
    ('drink-2', 'Energy Drink II', 500, 0, 0, 0, 1, 1, 1, 1, 0.3, '/assets/catalog/energy-drink.png', 'drink-1', CURRENT_TIMESTAMP),
    ('drink-3', 'Energy Drink III', 1000, 0, 0, 0, 1, 1, 1, 1, 0.5, '/assets/catalog/energy-drink.png', 'drink-2', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
