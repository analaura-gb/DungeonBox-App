-- Catalog data. Ids must match frontend/game/src/game/content.ts:
-- adding a weapon, passive item or character to the game needs a new migration like this one.

INSERT INTO "weapons" ("id", "name", "max_level") VALUES
    ('compiler', 'Programming Balloon', 6),
    ('duck', 'Algorithm Book', 6),
    ('gc', 'Garbage Collector', 6),
    ('wifi', 'Wi-Fi Pulse', 6),
    ('solder', 'Soldering Iron', 6),
    ('drone', 'Drone Swarm', 6);

INSERT INTO "passive_items" ("id", "name", "max_level") VALUES
    ('espresso', 'Espresso Shot', 5),
    ('ram', 'Extra RAM', 5),
    ('overclock', 'Overclock', 5),
    ('bigO', 'Big-O Optimization', 5),
    ('magnet', 'Git Magnet', 5),
    ('notes', 'Lecture Notes', 5),
    ('thermal', 'Thermal Paste', 5);

INSERT INTO "characters" ("id", "name", "start_weapon_id") VALUES
    ('ana-laura', 'Ana Laura', 'compiler'),
    ('guilherme', 'Guilherme', 'duck'),
    ('enzo', 'Enzo', 'gc'),
    ('bruno', 'Bruno', 'wifi');
