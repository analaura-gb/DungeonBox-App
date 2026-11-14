import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Game,
  type GameStatus,
  type HudSnapshot,
  type RunResult,
  type UpgradeOption,
} from "../../game/engine";
import {
  MAX_PASSIVES,
  MAX_WEAPONS,
  TIME_LIMIT,
  type CharacterDef,
  type GameData,
  type PickupDef,
} from "../../game/content";
import { fmtTime } from "../../game/format";
import {
  gameService,
  type FinishRunRequest,
  type RunSummary,
} from "../../services/GameService";
import { storeService } from "../../services/StoreService";
import { Joystick } from "./Joystick";
import {
  NO_ART,
  PIXEL_ART,
  onSpriteLoaded,
  spriteStatus,
  spriteVersion,
} from "../../game/sprites";
import { readMuted } from "../../game/audio";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

type SaveState =
  | { state: "saving" }
  | { state: "saved"; runId: string; coins: number }
  | { state: "error" };

type Scores = RunSummary[] | "error" | null;

function toFinishRequest(r: RunResult): FinishRunRequest {
  return {
    won: r.won,
    score: r.score,
    kills: r.kills,
    levelReached: r.level,
    survivedTime: Math.min(TIME_LIMIT, Math.floor(r.time)),
    weapons: r.weapons,
    passiveItems: r.passives,
  };
}

const emptyHud: HudSnapshot = {
  hp: 100,
  maxHp: 100,
  level: 1,
  xp: 0,
  xpNext: 6,
  time: 0,
  kills: 0,
  score: 0,
  weapons: [],
  passives: [],
  boss: null,
};

export function GameView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<GameStatus>("menu");
  const [muted, setMuted] = useState(readMuted);
  const [catalog, setCatalog] = useState<GameData | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [catalogError, setCatalogError] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(emptyHud);
  const [options, setOptions] = useState<UpgradeOption[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [scores, setScores] = useState<Scores>(null);
  const [save, setSave] = useState<SaveState | null>(null);
  const runRef = useRef<Promise<string | null>>(Promise.resolve(null));
  const [charIdx, setCharIdx] = useState(0);
  const [panel, setPanel] = useState<"main" | "scores" | "help">("main");
  const charRef = useRef(0);
  const weapons = useMemo(
    () => new Map(catalog?.weapons.map((w) => [w.id, w])),
    [catalog],
  );
  const passives = useMemo(
    () => new Map(catalog?.passiveItems.map((p) => [p.id, p])),
    [catalog],
  );

  const characters = catalog?.characters ?? [];

  const loadCatalog = useCallback(() => {
    Promise.all([
      gameService.getCatalog(),
      storeService.getCharacters(),
      storeService.getOwnedCharacters(),
      storeService.getOwnedPowerUps(),
    ]).then(
      ([gameCatalog, all, mine, powerUps]) => {
        if (all.length === 0) {
          setCatalogError(true);
          return;
        }
        const ids = new Set(mine.map((c) => c.id));
        const first = Math.max(
          0,
          all.findIndex((c) => ids.has(c.id)),
        );
        setOwned(ids);
        setCharIdx(first);
        charRef.current = first;
        setCatalog({ ...gameCatalog, characters: all, powerUps });
      },
      () => setCatalogError(true),
    );
  }, []);

  useEffect(loadCatalog, [loadCatalog]);

  useEffect(() => {
    if (!catalog) return;
    const g = new Game(
      hostRef.current!,
      {
        onHud: setHud,
        onStatus: setStatus,
        onLevelUp: setOptions,
        onGameOver: (r) => {
          setResult(r);
          setSave({ state: "saving" });
          setScores(null);
          runRef.current
            .then((runId) => {
              if (!runId) throw new Error("Run was not started");
              return gameService.finishRun(runId, toFinishRequest(r));
            })
            .then((run) => {
              setSave({
                state: "saved",
                runId: run.id,
                coins: run.coinsEarned,
              });
              gameService
                .myBestRuns()
                .then(setScores, () => setScores("error"));
            })
            .catch(() => {
              setSave({ state: "error" });
              setScores("error");
            });
        },
      },
      catalog,
    );
    gameRef.current = g;
    return () => g.destroy();
  }, [catalog]);

  const start = useCallback(
    (idx: number) => {
      const character = catalog?.characters[idx];
      if (!gameRef.current || !character || !owned.has(character.id)) return;
      setCharIdx(idx);
      charRef.current = idx;
      setResult(null);
      setSave(null);
      runRef.current = gameService
        .startRun(character.id)
        .then((run) => run.id)
        .catch(() => null);
      gameRef.current?.start(character.id);
    },
    [catalog, owned],
  );

  const restart = useCallback(() => start(charRef.current), [start]);

  const openScores = () => {
    setPanel("scores");
    setScores(null);
    gameService.myBestRuns().then(setScores, () => setScores("error"));
  };

  const toggleMute = useCallback(() => {
    const game = gameRef.current;
    if (game) setMuted(game.toggleMute());
  }, []);

  const choose = (o: UpgradeOption) => gameRef.current?.applyUpgrade(o);
  const onJoy = useCallback((x: number, y: number, active: boolean) => {
    gameRef.current?.setTouch(x, y, active);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "m") toggleMute();
      if (
        (status === "dead" || status === "won") &&
        (k === "r" || k === "enter" || k === " ")
      )
        restart();
      if (status === "menu" && (k === "enter" || k === " "))
        start(charRef.current);
      if (status === "levelup" && ["1", "2", "3"].includes(k)) {
        const o = options[Number(k) - 1];
        if (o) choose(o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [status, options, restart, start, toggleMute]);

  const playing =
    status === "playing" || status === "paused" || status === "levelup";
  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);
  const xpPct = Math.min(100, (hud.xp / hud.xpNext) * 100);

  return (
    <div
      className="relative flex w-full flex-1 touch-manipulation overflow-hidden bg-[#070b14] font-mono text-cyan-50 select-none"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button"))
          gameRef.current?.click();
      }}
    >
      <div ref={hostRef} className="absolute inset-0" />
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />

      {playing && <Joystick onMove={onJoy} />}

      {playing && (
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full border border-cyan-400/30 bg-black/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-[width] duration-150"
                    style={{
                      width: `${xpPct}%`,
                      boxShadow: "0 0 14px rgba(99,230,255,.7)",
                    }}
                  />
                </div>
                <div className="mt-1 h-2.5 w-2/3 overflow-hidden rounded-full border border-rose-400/30 bg-black/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-150"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-400/30 bg-black/60 px-2 py-1 text-center">
                <div className="text-[9px] uppercase tracking-widest text-cyan-300/70">
                  Lv
                </div>
                <div className="text-lg leading-none font-bold text-cyan-200">
                  {hud.level}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex gap-1.5 sm:gap-3">
                <Stat
                  label="TIME"
                  value={fmtTime(hud.time)}
                  extra={` / ${fmtTime(TIME_LIMIT)}`}
                />
                <Stat label="SCORE" value={hud.score.toLocaleString()} />
                <Stat label="KILLS" value={String(hud.kills)} />
              </div>
              <div className="flex gap-1.5">
                <button
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="pointer-events-auto rounded-lg border border-cyan-400/40 bg-black/60 px-3 py-1.5 text-cyan-200 active:scale-95"
                  onClick={toggleMute}
                >
                  {muted ? "🔇" : "🔊"}
                </button>
                <button
                  className="pointer-events-auto rounded-lg border border-cyan-400/40 bg-black/60 px-3 py-1.5 text-cyan-200 active:scale-95"
                  onClick={() => gameRef.current?.togglePause()}
                >
                  {status === "paused" ? "▶" : "❚❚"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {hud.weapons.map((w) => (
                <Chip
                  key={w.id}
                  src={weapons.get(w.id)?.imageUrl}
                  level={w.level}
                  color={weapons.get(w.id)?.color ?? ""}
                />
              ))}
              {hud.passives.map((p) => (
                <Chip
                  key={p.id}
                  src={passives.get(p.id)?.imageUrl}
                  level={p.level}
                  color={passives.get(p.id)?.color ?? ""}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {playing && hud.boss && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-1 text-center text-[10px] tracking-[0.3em] text-rose-300">
              {hud.boss.name}
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-rose-500/50 bg-black/70">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-fuchsia-400 transition-[width] duration-150"
                style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {!catalog && (
        <Overlay>
          <div className="text-center text-sm text-cyan-100/70">
            {catalogError ? (
              <>
                <p>Couldn't load the game data.</p>
                <button
                  onClick={() => {
                    setCatalogError(false);
                    loadCatalog();
                  }}
                  className="mt-4 rounded-lg border border-cyan-400/40 bg-black/50 px-5 py-2 text-cyan-200 active:scale-95"
                >
                  ↻ Try again
                </button>
              </>
            ) : (
              <p>Loading game data...</p>
            )}
          </div>
        </Overlay>
      )}

      {catalog && status === "menu" && (
        <Overlay>
          <div className="w-full max-w-3xl px-4 text-center">
            <div className="float-y">
              <div className="text-[10px] tracking-[0.3em] text-cyan-400/80 sm:text-xs sm:tracking-[0.55em]">
                DEPT. OF COMPUTER ENGINEERING
              </div>
              <h1 className="mt-2 text-4xl leading-none font-black tracking-tight text-transparent sm:text-6xl bg-gradient-to-b from-cyan-200 to-emerald-400 bg-clip-text">
                DUNGEONBOX
                <br />
                SURVIVORS
              </h1>
              <p className="mt-3 text-sm text-cyan-100/60">
                Survive the semester
              </p>
            </div>

            {panel === "main" && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4">
                  {characters.map((c, i) => (
                    <button
                      key={c.id}
                      disabled={!owned.has(c.id)}
                      onClick={() => {
                        setCharIdx(i);
                        charRef.current = i;
                      }}
                      className={`pop-in rounded-xl border p-2 text-left sm:p-3 transition active:scale-95 ${
                        !owned.has(c.id)
                          ? "border-cyan-400/10 bg-black/40 grayscale [&>*]:opacity-60"
                          : i === charIdx
                            ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_24px_rgba(99,230,255,.35)]"
                            : "border-cyan-400/20 bg-black/40 hover:border-cyan-300/50"
                      }`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {owned.has(c.id) ? (
                        <>
                          <Icon src={c.imageUrl} size={40} />
                          <div
                            className="mt-1 text-sm font-bold"
                            style={{ color: c.color }}
                          >
                            {c.name}
                          </div>
                          <div className="text-[10px] tracking-wide text-cyan-100/50 uppercase">
                            {c.title}
                          </div>
                          <div className="mt-1 text-[10px] leading-snug text-cyan-100/70 sm:text-[11px]">
                            {c.description}
                          </div>
                          <div className="mt-2 text-[10px] text-cyan-300/80">
                            <Icon
                              src={weapons.get(c.initialWeaponId)?.imageUrl}
                              size={14}
                            />{" "}
                            {weapons.get(c.initialWeaponId)?.name}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center text-3xl font-black text-cyan-100/60">
                            ?
                          </div>
                          <div className="mt-1 text-sm font-bold text-cyan-100/60">
                            ???
                          </div>
                          <div className="text-[10px] tracking-wide text-cyan-100/40 uppercase">
                            🔒 Locked
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                {characters.some((c) => !owned.has(c.id)) && (
                  <div className="mt-3 w-full text-center">
                    <a
                      href={import.meta.env.VITE_STORE_URL}
                      className="text-xs text-amber-300/90 underline underline-offset-4"
                    >
                      Unlock more characters in the Store →
                    </a>
                  </div>
                )}

                <button
                  onClick={() => start(charIdx)}
                  disabled={!owned.has(characters[charIdx]?.id)}
                  className="glow-pulse mt-4 w-full max-w-xs rounded-xl border-2 border-cyan-300 bg-cyan-400/15 px-8 py-3 text-lg sm:mt-6 sm:py-4 sm:text-xl font-black tracking-widest text-cyan-100 active:scale-95 disabled:opacity-40"
                >
                  ▶ START
                </button>
                <div className="mt-4 flex justify-center gap-6 text-xs text-cyan-300/70">
                  <button
                    onClick={() => setPanel("help")}
                    className="underline underline-offset-4"
                  >
                    Instructions
                  </button>
                  <button
                    onClick={openScores}
                    className="underline underline-offset-4"
                  >
                    High Scores
                  </button>
                </div>
              </>
            )}

            {panel === "help" && (
              <div className="mt-6">
                <Instructions
                  bosses={catalog.bosses.map((b) => b.name)}
                  pickups={catalog.pickups}
                />
                <button
                  onClick={() => setPanel("main")}
                  className="mt-4 rounded-lg border border-cyan-400/40 bg-black/50 px-5 py-2 text-cyan-200 active:scale-95"
                >
                  ← Back
                </button>
              </div>
            )}

            {panel === "scores" && (
              <div className="mt-6">
                <ScoreTable scores={scores} characters={characters} />
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setPanel("main")}
                    className="rounded-lg border border-cyan-400/40 bg-black/50 px-5 py-2 text-cyan-200 active:scale-95"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {status === "levelup" && (
        <Overlay dim="bg-black/70">
          <div className="w-full max-w-3xl px-4">
            <div className="text-center">
              <div className="text-xs tracking-[0.4em] text-amber-300/80">
                COMMIT PUSHED
              </div>
              <h2 className="text-3xl font-black text-amber-200 sm:text-4xl">
                LEVEL {hud.level}
              </h2>
              <p className="text-xs text-cyan-100/50">
                {isTouch
                  ? "tap an upgrade"
                  : "choose an upgrade · press 1 / 2 / 3"}
              </p>
            </div>
            <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
              {options.map((o, i) => (
                <button
                  key={o.key}
                  onClick={() => choose(o)}
                  className="pop-in group rounded-xl border-2 bg-black/70 p-3 text-left sm:p-4 transition active:scale-95"
                  style={{
                    borderColor: o.color + "66",
                    animationDelay: `${i * 70}ms`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <Icon src={o.image} size={44} />
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest"
                      style={{ background: o.color + "22", color: o.color }}
                    >
                      {o.isNew ? "NEW" : "LV " + o.level}
                    </span>
                  </div>
                  <div
                    className="mt-2 text-base font-bold"
                    style={{ color: o.color }}
                  >
                    {o.name}
                  </div>
                  <div className="mt-1 text-xs leading-snug text-cyan-100/70">
                    {o.desc}
                  </div>
                  {!isTouch && (
                    <div className="mt-3 text-[10px] tracking-widest text-cyan-300/50">
                      [{i + 1}] SELECT
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {status === "paused" && (
        <Overlay dim="bg-black/75">
          <div className="pop-in w-full max-w-sm px-4 text-center">
            <h2 className="text-4xl font-black tracking-widest text-cyan-200">
              PAUSED
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Box label="SCORE" value={hud.score.toLocaleString()} />
              <Box label="TIME" value={fmtTime(hud.time)} />
              <Box label="KILLS" value={String(hud.kills)} />
              <Box label="LEVEL" value={String(hud.level)} />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => gameRef.current?.togglePause()}
                className="rounded-xl border-2 border-cyan-300 bg-cyan-400/15 py-3 font-bold tracking-widest text-cyan-100 active:scale-95"
              >
                ▶ RESUME
              </button>
              <button
                onClick={restart}
                className="rounded-xl border border-amber-400/50 bg-black/50 py-2.5 text-amber-200 active:scale-95"
              >
                ↻ RESTART
              </button>
              <button
                onClick={() => {
                  gameRef.current?.setStatus("menu");
                }}
                className="rounded-xl border border-cyan-400/30 bg-black/50 py-2.5 text-cyan-200/80 active:scale-95"
              >
                ⌂ MAIN MENU
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {(status === "dead" || status === "won") && result && (
        <Overlay dim="bg-black/80">
          <div className="pop-in w-full max-w-lg px-4 text-center">
            {result.won ? (
              <>
                <div className="text-6xl">🎓</div>
                <h2 className="mt-2 text-3xl font-black tracking-widest text-emerald-300 sm:text-4xl">
                  GRADUATED!
                </h2>
                <p className="mt-1 text-xs text-emerald-100/60">
                  you survived the whole semester · +5000 score
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl">💀</div>
                <h2 className="mt-2 text-3xl font-black tracking-widest text-rose-400 sm:text-4xl">
                  STUDENT FAILED...
                </h2>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Box label="SCORE" value={result.score.toLocaleString()} />
              <Box label="TIME" value={fmtTime(result.time)} />
              <Box label="KILLS" value={String(result.kills)} />
              <Box label="LEVEL" value={String(result.level)} />
            </div>
            <div className="mt-3 text-sm">
              {save?.state === "saving" && (
                <span className="text-cyan-100/50">Saving run...</span>
              )}
              {save?.state === "saved" && (
                <span className="font-bold text-amber-300">
                  +{save.coins} coins
                </span>
              )}
              {save?.state === "error" && (
                <span className="text-rose-300/80">Couldn't save this run</span>
              )}
            </div>
            {save?.state === "saved" &&
              Array.isArray(scores) &&
              scores[0]?.id === save.runId && (
                <div className="mt-2 animate-pulse text-sm font-bold tracking-widest text-amber-300">
                  ★ NEW HIGH SCORE ★
                </div>
              )}
            <div className="mt-4">
              <ScoreTable
                scores={scores}
                characters={characters}
                compact
                highlight={save?.state === "saved" ? save.runId : undefined}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={restart}
                className="glow-pulse flex-1 rounded-xl border-2 border-cyan-300 bg-cyan-400/15 py-3 font-black tracking-widest text-cyan-100 active:scale-95"
              >
                ↻ RETAKE{!isTouch && " (R)"}
              </button>
              <button
                onClick={() => gameRef.current?.setStatus("menu")}
                className="flex-1 rounded-xl border border-cyan-400/30 bg-black/50 py-3 text-cyan-200/80 active:scale-95"
              >
                ⌂ MAIN MENU
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({
  children,
  dim = "bg-black/60",
}: {
  children: ReactNode;
  dim?: string;
}) {
  return (
    <div
      className={`relative z-20 flex flex-1 py-6 ${dim} backdrop-blur-[3px]`}
    >
      <div className="m-auto flex w-full justify-center">{children}</div>
    </div>
  );
}

function Instructions({
  bosses,
  pickups,
}: {
  bosses: string[];
  pickups: PickupDef[];
}) {
  const pickup = (id: string) => pickups.find((p) => p.id === id)?.imageUrl;
  const pause = isTouch ? "tap ❚❚" : "P / Esc";
  const sound = isTouch ? "tap 🔊" : "M";
  const rows: [string, ReactNode][] = [
    [
      "MOVE",
      isTouch
        ? "Drag anywhere on the screen."
        : "WASD / Arrows, or drag with the mouse.",
    ],
    ["ATTACK", "Weapons fire on their own. Just keep moving."],
    ["LEVEL UP", "Collect XP orbs, then pick 1 of 3 upgrades."],
    [
      "BUILD",
      `Up to ${MAX_WEAPONS} weapons and ${MAX_PASSIVES} passive skills. Picking one again levels it up.`,
    ],
    [
      "ITEMS",
      <>
        <Icon src={pickup("heal")} size={14} /> heals ·{" "}
        <Icon src={pickup("magnet")} size={14} /> pulls all XP ·{" "}
        <Icon src={pickup("nuke")} size={14} /> clears the screen
      </>,
    ],
    ["BOSSES", `${bosses.join(", ")}. One every 95 s.`],
    [
      "GOAL",
      `Survive ${fmtTime(TIME_LIMIT)} to graduate. Pause: ${pause}. Sound: ${sound}.`,
    ],
  ];
  return (
    <div className="mx-auto max-w-md rounded-xl border border-cyan-400/20 bg-black/60 p-4 text-left">
      {rows.map(([label, text]) => (
        <div
          key={label}
          className="grid grid-cols-[70px_1fr] gap-2 py-1 text-xs leading-snug"
        >
          <span className="text-[10px] tracking-widest text-cyan-300/60">
            {label}
          </span>
          <span className="text-cyan-100/80">{text}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="whitespace-nowrap rounded-lg border border-cyan-400/20 bg-black/60 px-2 py-1 sm:px-2.5">
      <span className="mr-1.5 text-[9px] tracking-widest text-cyan-300/60">
        {label}
      </span>
      <span className="font-bold text-cyan-100">{value}</span>
      {extra && (
        <span className="hidden font-bold text-cyan-100 sm:inline">
          {extra}
        </span>
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-400/25 bg-black/50 px-2 py-2">
      <div className="text-[9px] tracking-widest text-cyan-300/60">{label}</div>
      <div className="text-lg font-bold text-cyan-100">{value}</div>
    </div>
  );
}

function Icon({ src, size }: { src: string | null | undefined; size: number }) {
  useSyncExternalStore(onSpriteLoaded, spriteVersion);
  const status = src ? spriteStatus(src) : "missing";
  if (status === undefined)
    return (
      <span
        className="inline-block align-middle"
        style={{ width: size, height: size }}
      />
    );
  return (
    <img
      src={status === "ok" ? src! : NO_ART}
      alt=""
      width={size}
      height={size}
      className="inline-block object-contain align-middle"
      style={{
        width: size,
        height: size,
        imageRendering: PIXEL_ART ? "pixelated" : "auto",
      }}
    />
  );
}

function Chip({
  src,
  level,
  color,
}: {
  src: string | null | undefined;
  level: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border bg-black/60 px-1.5 py-0.5 text-xs"
      style={{ borderColor: color + "55" }}
    >
      <Icon src={src} size={16} />
      <span className="text-[10px] font-bold" style={{ color }}>
        {level}
      </span>
    </div>
  );
}

function ScoreTable({
  scores,
  characters,
  compact,
  highlight,
}: {
  scores: Scores;
  characters: CharacterDef[];
  compact?: boolean;
  highlight?: string;
}) {
  const box =
    "rounded-xl border border-cyan-400/20 bg-black/50 p-6 text-sm text-cyan-100/50";
  if (scores === null) return <div className={box}>Loading...</div>;
  if (scores === "error")
    return <div className={box}>Couldn't load the high scores.</div>;
  if (!scores.length)
    return <div className={box}>No records yet — go break something.</div>;
  const list = compact ? scores.slice(0, 5) : scores;
  return (
    <div className="overflow-hidden rounded-xl border border-cyan-400/25 bg-black/50">
      <div className="grid grid-cols-[28px_1fr_70px_56px_46px] gap-2 border-b border-cyan-400/20 px-3 py-2 text-[10px] tracking-widest text-cyan-300/60">
        <span>#</span>
        <span className="text-left">STUDENT</span>
        <span className="text-right">SCORE</span>
        <span className="text-right">TIME</span>
        <span className="text-right">LV</span>
      </div>
      {list.map((s, i) => (
        <div
          key={s.id}
          className={`grid grid-cols-[28px_1fr_70px_56px_46px] gap-2 px-3 py-1.5 text-xs ${
            highlight === s.id
              ? "bg-amber-300/10 text-amber-200"
              : "text-cyan-100/80"
          }`}
        >
          <span className="text-cyan-400/70">{i + 1}</span>
          <span className="truncate text-left">
            {characters.find((c) => c.id === s.characterId)?.name ??
              s.characterId}
          </span>
          <span className="text-right font-bold">
            {s.score.toLocaleString()}
          </span>
          <span className="text-right">{fmtTime(s.survivedTime)}</span>
          <span className="text-right">{s.levelReached}</span>
        </div>
      ))}
    </div>
  );
}
