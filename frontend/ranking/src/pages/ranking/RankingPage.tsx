import { useEffect, useState } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { useAuth } from "../../contexts/useAuth";
import { rankingService, type BuildItem, type MyStats, type RankingEntry } from "../../services/RankingService";
import { gameService, type BuildPiece } from "../../services/GameService";
import { storeService, type StoreCharacter } from "../../services/StoreService";

type RankingData = {
  ranking: RankingEntry[];
  myStats: MyStats;
  characters: Map<string, StoreCharacter>;
  pieces: Map<string, BuildPiece>;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RankingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <p className="text-center text-sm text-slate-400">Checking session...</p>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <section className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Sign in required
            </span>

            <h2 className="mt-4 text-3xl font-bold text-white">Sign in to see the ranking</h2>

            <p className="mt-3 text-base leading-7 text-slate-400">
              The ranking is available to signed-in players only.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={`${import.meta.env.VITE_AUTH_URL}login`}
                className="rounded-xl bg-amber-500 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-amber-600"
              >
                Sign in
              </a>

              <a
                href={`${import.meta.env.VITE_AUTH_URL}register`}
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-center font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Sign up
              </a>
            </div>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Ranking />
    </MainLayout>
  );
}


const PODIUM = [
  { medal: "🥇", row: "bg-yellow-400/10" },
  { medal: "🥈", row: "bg-slate-300/10" },
  { medal: "🥉", row: "bg-orange-400/10" },
];

function Ranking() {
  const [data, setData] = useState<RankingData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      rankingService.getRanking(),
      rankingService.getMyStats(),
      storeService.getCharacters().catch(() => []),
      gameService.getCatalog().catch(() => ({ weapons: [], passiveItems: [] })),
    ])
      .then(([ranking, myStats, characters, catalog]) =>
        setData({
          ranking,
          myStats,
          characters: new Map(characters.map((c) => [c.id, c])),
          pieces: new Map([...catalog.weapons, ...catalog.passiveItems].map((p) => [p.id, p])),
        }),
      )
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="text-center text-sm text-rose-300">Couldn't load the ranking. Try again later.</p>;
  }

  if (!data) {
    return <p className="text-center text-sm text-slate-400">Loading ranking...</p>;
  }

  const { ranking, myStats, characters, pieces } = data;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Ranking</h2>
        <p className="mt-1 text-slate-400">Top 10 runs of DungeonBox Survivors.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FavoriteCharacterCard
          favorite={myStats.favoriteCharacter}
          character={myStats.favoriteCharacter ? characters.get(myStats.favoriteCharacter.id) : undefined}
        />
        <HighlightCard
          icon="🏅"
          label="Your position"
          value={myStats.position ? `#${myStats.position}` : "—"}
          accent
        />
        <HighlightCard icon="🏆" label="Best score" value={myStats.bestScore.toLocaleString()} />
        <HighlightCard icon="⏱" label="Best time" value={formatTime(myStats.bestSurvivedTime)} />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-[#131A2A] px-5 py-4 shadow-xl sm:grid-cols-4">
        <CompactStat icon="🎮" value={String(myStats.totalRuns)} label={`runs · ${myStats.totalWins} graduated`} />
        <CompactStat icon="💀" value={myStats.totalEnemiesKilled.toLocaleString()} label="enemies defeated" />
        <CompactStat icon="⌛" value={formatTime(myStats.totalSurvivedTime)} label="time played" />
        <CompactStat icon="🪙" value={myStats.totalCoinsCollected.toLocaleString()} label="coins earned" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#131A2A] shadow-xl">
        {ranking.length === 0 ? (
          <p className="p-8 text-center text-slate-400">
            No runs yet.{" "}
            <a href={import.meta.env.VITE_GAME_URL} className="font-semibold text-amber-400 hover:text-amber-300">
              Play a run
            </a>{" "}
            to appear here.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Character</th>
                <th className="hidden px-4 py-3 md:table-cell">Build</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry) => {
                const podium = PODIUM[entry.position - 1];
                const row = entry.isMe ? "bg-amber-500/15 text-amber-200" : `${podium?.row ?? ""} text-slate-200`;

                return (
                  <tr key={entry.runId} className={`border-b border-slate-800/60 last:border-0 ${row}`}>
                    <td className="px-4 py-3 font-semibold">
                      {podium ? <span className="text-xl leading-none">{podium.medal}</span> : entry.position}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.isMe ? "You" : `Player ${entry.userId.slice(0, 6)}`}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <CharacterImage
                          character={characters.get(entry.characterId)}
                          alt=""
                          className="h-7 w-7 shrink-0"
                        />
                        <span className="hidden whitespace-nowrap sm:inline">
                          {characters.get(entry.characterId)?.name ?? entry.characterId}
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Build weapons={entry.weapons} passiveItems={entry.passiveItems} pieces={pieces} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{entry.score.toLocaleString()}</td>
                    <td className="hidden px-4 py-3 text-right sm:table-cell">{formatTime(entry.survivedTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

const missingArtImage = `${import.meta.env.BASE_URL}no-art.svg`;

function Build({
  weapons,
  passiveItems,
  pieces,
}: {
  weapons: BuildItem[];
  passiveItems: BuildItem[];
  pieces: Map<string, BuildPiece>;
}) {
  if (weapons.length === 0 && passiveItems.length === 0) {
    return <span className="text-slate-500">—</span>;
  }

  const piece = (item: BuildItem) => {
    const name = pieces.get(item.id)?.name ?? item.id;

    return (
      <li key={item.id} className="relative" title={`${name} · Lv ${item.level}`}>
        <img
          src={pieces.get(item.id)?.imageUrl ?? missingArtImage}
          alt={`${name} level ${item.level}`}
          onError={(event) => {
            const img = event.currentTarget;

            if (img.src.endsWith(missingArtImage)) {
              return;
            }

            img.src = missingArtImage;
          }}
          className="h-7 w-7 rounded-md bg-slate-900/80 object-contain p-0.5 [image-rendering:pixelated]"
        />
        <span className="absolute -right-1 -bottom-1 rounded bg-slate-950 px-0.5 text-[9px] leading-tight font-bold text-slate-200">
          {item.level}
        </span>
      </li>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <ul aria-label="Weapons" className="flex gap-1.5">
        {weapons.map(piece)}
      </ul>
      {passiveItems.length > 0 && <span className="h-6 w-px bg-slate-700" />}
      <ul aria-label="Passive items" className="flex gap-1.5">
        {passiveItems.map(piece)}
      </ul>
    </div>
  );
}

function CharacterImage({
  character,
  alt,
  className,
}: {
  character: StoreCharacter | undefined;
  alt: string;
  className: string;
}) {
  return (
    <img
      src={character?.imageUrl ?? missingArtImage}
      alt={alt}
      onError={(event) => {
        const img = event.currentTarget;

        if (img.src.endsWith(missingArtImage)) {
          return;
        }

        img.src = missingArtImage;
      }}
      className={`object-contain [image-rendering:pixelated] ${className}`}
    />
  );
}

function FavoriteCharacterCard({
  favorite,
  character,
}: {
  favorite: MyStats["favoriteCharacter"];
  character: StoreCharacter | undefined;
}) {
  const name = character?.name ?? favorite?.id;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#131A2A] p-4 shadow-xl">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
        {favorite ? (
          <CharacterImage character={character} alt={name ?? ""} className="h-14 w-14" />
        ) : (
          <span className="text-2xl text-slate-500">?</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-slate-400">Favorite</p>
        <p className="truncate text-lg font-bold text-white">
          {favorite ? name : "—"}
        </p>
        <p className="text-xs text-slate-400">{favorite ? `${favorite.runs} ${favorite.runs === 1 ? "run" : "runs"}` : "no runs yet"}</p>
      </div>
    </div>
  );
}

function HighlightCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-4 shadow-xl">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
        <span className="text-base">{icon}</span>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent ? "text-amber-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function CompactStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="font-bold text-white">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
