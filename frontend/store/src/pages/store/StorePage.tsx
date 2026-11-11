import { useCallback, useEffect, useState } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { ApiError } from "../../services/Api";
import { redirectToAuth } from "../../app/navigation";
import {
  storeService,
  type Character,
  type PowerUp,
} from "../../services/StoreService";

type CatalogState = {
  powerUps: PowerUp[];
  characters: Character[];
  ownedPowerUpIds: string[];
  ownedCharacterIds: string[];
  coins: number;
};

const emptyCatalog: CatalogState = {
  powerUps: [],
  characters: [],
  ownedPowerUpIds: [],
  ownedCharacterIds: [],
  coins: 0,
};

const missingArtImage = `${import.meta.env.BASE_URL}no-art.svg`;

export function StorePage() {
  const [catalog, setCatalog] = useState<CatalogState>(emptyCatalog);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async (): Promise<CatalogState> => {
    const [powerUps, characters, wallet, ownedPowerUps, ownedCharacters] =
      await Promise.all([
        storeService.listPowerUps(),
        storeService.listCharacters(),
        storeService.wallet(),
        storeService.ownedPowerUps(),
        storeService.ownedCharacters(),
      ]);

    return {
      powerUps,
      characters,
      ownedPowerUpIds: ownedPowerUps.map((item) => item.id),
      ownedCharacterIds: ownedCharacters.map((item) => item.id),
      coins: wallet.coins,
    };
  }, []);

  useEffect(() => {
    let active = true;

    void loadCatalog()
      .then((next) => {
        if (!active) return;
        setCatalog(next);
        setIsAuthenticated(true);
      })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 401) {
          redirectToAuth();
          return;
        }

        if (active && reason instanceof Error) setError(reason.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadCatalog]);

  async function handlePurchase(
    kind: "power-up" | "character",
    id: string,
    name: string,
  ) {
    setError("");
    setNotice("");
    setPurchasingId(id);

    try {
      const result =
        kind === "power-up"
          ? await storeService.purchasePowerUp(id)
          : await storeService.purchaseCharacter(id);

      setNotice(`${name} purchased. ${result.remainingCoins} coins left.`);
      setCatalog(await loadCatalog());
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        redirectToAuth();
        return;
      }

      setError(reason instanceof Error ? reason.message : "Purchase failed.");
    } finally {
      setPurchasingId("");
    }
  }

  if (isLoading) {
    return (
      <MainLayout isAuthenticated={isAuthenticated} isLoading>
        <p role="status" className="text-slate-400">
          Loading the store...
        </p>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={isAuthenticated} isLoading={false}>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Store</h2>
            <p className="mt-1 text-sm text-slate-400">
              Spend the coins you earned in your runs.
            </p>
          </div>

          <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400">
            {catalog.coins} coins
          </span>
        </header>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-400">
            {notice}
          </p>
        )}

        <CatalogSection
          title="Power-ups"
          emptyLabel="No power-ups available yet."
          items={catalog.powerUps.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.imageUrl ?? missingArtImage,
            detail: `ATK ${item.attack} · DEF ${item.defense} · HP ${item.health}`,
          }))}
          ownedIds={catalog.ownedPowerUpIds}
          coins={catalog.coins}
          purchasingId={purchasingId}
          onPurchase={(id, name) => handlePurchase("power-up", id, name)}
        />

        <CatalogSection
          title="Characters"
          emptyLabel="No characters available yet."
          items={catalog.characters.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.imageUrl ?? missingArtImage,
            detail: `Starts with weapon ${item.initialWeaponId}`,
          }))}
          ownedIds={catalog.ownedCharacterIds}
          coins={catalog.coins}
          purchasingId={purchasingId}
          onPurchase={(id, name) => handlePurchase("character", id, name)}
        />
      </section>
    </MainLayout>
  );
}

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  detail: string;
};

type CatalogSectionProps = {
  title: string;
  emptyLabel: string;
  items: CatalogItem[];
  ownedIds: string[];
  coins: number;
  purchasingId: string;
  onPurchase: (id: string, name: string) => void;
};

function CatalogSection({
  title,
  emptyLabel,
  items,
  ownedIds,
  coins,
  purchasingId,
  onPurchase,
}: CatalogSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-white">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const owned = ownedIds.includes(item.id);
            const affordable = coins >= item.price;

            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#131A2A] p-5"
              >
                <img
                  src={item.image}
                  alt=""
                  onError={(event) => {
                    const img = event.currentTarget;

                    if (img.src.endsWith(missingArtImage)) {
                      return;
                    }

                    img.src = missingArtImage;
                  }}
                  className="aspect-[19/9] w-full rounded-xl border border-slate-800 object-cover [image-rendering:pixelated]"
                />

                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>

                <p className="text-sm text-amber-400">{item.price} coins</p>

                <button
                  type="button"
                  disabled={owned || !affordable || purchasingId === item.id}
                  onClick={() => onPurchase(item.id, item.name)}
                  className="mt-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {owned
                    ? "Owned"
                    : purchasingId === item.id
                      ? "Buying..."
                      : affordable
                        ? "Buy"
                        : "Not enough coins"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
