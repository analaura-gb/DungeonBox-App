GAME SPRITES
============
Format: square PNG with a transparent background. The file name must match the list exactly.
If a file is missing, the game uses the old emoji instead.
Pixel art? Set PIXEL_ART to true in src/game/sprites.ts (then you can draw at 32x32).

characters/  (64x64, draw them facing RIGHT)
  ana-laura.png  guilherme.png  enzo.png  bruno.png
  Optional walk frame: <id>-walk.png (e.g. ana-laura-walk.png), same size, also facing RIGHT.
  While moving, the game alternates between <id>.png and <id>-walk.png.
  Optional menu portrait: <id>-front.png (e.g. ana-laura-front.png), shown on the character select screen.

enemies/  (64x64)
  bug.png       Bug
  null.png      Null Pointer
  crash.png     Kernel Panic
  merge.png     Merge Conflict
  deadline.png  Deadline
  legacy.png    Legacy Code

bosses/  (about 100x100)
  calc1.png     Calculus
  calc2.png     Linear Algebra
  calc3.png     Electromagnetism
  thesis.png    Thesis Defense

weapons/  (48x48; icon in menu/HUD. duck (the book) is also drawn on the map)
  compiler.png  duck.png  gc.png  wifi.png  solder.png  drone.png
  drone-shot.png  (32x32) one drone, used for the homing projectiles

passives/  (48x48; icon only, in menu/HUD)
  espresso.png  ram.png  overclock.png  bigO.png  magnet.png  notes.png  thermal.png

pickups/  (30x30, except xp)
  heal.png      pizza (heals)
  magnet.png    floppy disk (pulls XP)
  nuke.png      clears the screen
  xp.png        XP orb (16x16) - optional; without it the game draws a glowing orb

map/
  floor.png     floor tile, repeated forever (any square size; must tile seamlessly)
                its size in the world is FLOOR_TILE_SIZE in src/game/content.ts
