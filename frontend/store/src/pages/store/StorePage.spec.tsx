import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorePage } from "./StorePage";
import {
  storeService,
  type Character,
  type PowerUp,
} from "../../services/StoreService";
import { redirectToAuth } from "../../app/navigation";
import { ApiError } from "../../services/Api";

vi.mock("../../services/StoreService", () => ({
  storeService: {
    listPowerUps: vi.fn(),
    listCharacters: vi.fn(),
    wallet: vi.fn(),
    ownedPowerUps: vi.fn(),
    ownedCharacters: vi.fn(),
    purchasePowerUp: vi.fn(),
    purchaseCharacter: vi.fn(),
  },
}));

vi.mock("../../app/navigation", () => ({
  redirectToAuth: vi.fn(),
}));

const service = vi.mocked(storeService);

const cheapPowerUp = {
  id: "power-up-1",
  name: "Iron Will",
  price: 50,
  attack: 2,
  defense: 3,
  health: 10,
  movementSpeed: 1.1,
  attackSpeed: 1.2,
  projectileSpeed: 1,
  projectileSize: 1,
  regeneration: 0,
  imageUrl: "/assets/catalog/iron-will.png",
  requiredPowerUpId: null,
};

const pricyCharacter = {
  id: "character-1",
  name: "Knight",
  price: 500,
  initialWeaponId: "weapon-1",
  imageUrl: null,
};

function givenCatalog(
  overrides: {
    ownedPowerUpIds?: string[];
    coins?: number;
  } = {},
) {
  const owned = overrides.ownedPowerUpIds ?? [];

  service.listPowerUps.mockResolvedValue([cheapPowerUp]);
  service.listCharacters.mockResolvedValue([pricyCharacter]);
  service.wallet.mockResolvedValue({ coins: overrides.coins ?? 100 });
  service.ownedPowerUps.mockResolvedValue(
    owned.includes(cheapPowerUp.id) ? [cheapPowerUp] : [],
  );
  service.ownedCharacters.mockResolvedValue([]);
}

function givenCatalogThatNeverAnswers() {
  const pending = <T,>() => new Promise<T>(() => {});

  service.listPowerUps.mockReturnValue(pending<PowerUp[]>());
  service.listCharacters.mockReturnValue(pending<Character[]>());
  service.wallet.mockReturnValue(pending<{ coins: number }>());
  service.ownedPowerUps.mockReturnValue(pending<PowerUp[]>());
  service.ownedCharacters.mockReturnValue(pending<Character[]>());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StorePage", () => {
  it("shows the balance and the catalog once loaded", async () => {
    givenCatalog();

    render(<StorePage />);

    expect(await screen.findByText("100 coins")).toBeInTheDocument();
    expect(screen.getByText("Iron Will")).toBeInTheDocument();
    expect(screen.getByText("Knight")).toBeInTheDocument();
  });

  it("hides the free characters, which every player already has", async () => {
    givenCatalog();
    service.listCharacters.mockResolvedValue([
      { ...pricyCharacter, id: "starter", name: "Starter", price: 0 },
      pricyCharacter,
    ]);

    render(<StorePage />);

    expect(await screen.findByText("Knight")).toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
  });

  it("describes only what a power-up changes", async () => {
    givenCatalog();

    render(<StorePage />);

    expect(
      await screen.findByText(
        "+10 HP · +2 attack · +3 defense · +10% speed · +20% attack speed",
      ),
    ).toBeInTheDocument();
  });

  it("sums the buffs of the power-ups the player owns", async () => {
    const secondPowerUp = {
      ...cheapPowerUp,
      id: "power-up-2",
      name: "Iron Will II",
      attack: 1,
      defense: 0,
      health: 5,
      movementSpeed: 1.1,
      attackSpeed: 1,
      regeneration: 0.3,
    };
    givenCatalog();
    service.listPowerUps.mockResolvedValue([cheapPowerUp, secondPowerUp]);
    service.ownedPowerUps.mockResolvedValue([cheapPowerUp, secondPowerUp]);

    render(<StorePage />);

    const buffs = await screen.findByText("Current buffs");
    const list = within(buffs.parentElement!).getAllByRole("listitem");

    expect(list.map((item) => item.textContent)).toEqual([
      "+15 HP",
      "+3 attack",
      "+3 defense",
      "+0.3 HP/s",
      "+21% speed",
      "+20% attack speed",
    ]);
  });

  it("tells the player there are no buffs before the first power-up", async () => {
    givenCatalog();

    render(<StorePage />);

    expect(await screen.findByText(/None yet/)).toBeInTheDocument();
  });

  it("locks a power-up tier until the previous one is owned", async () => {
    const nextTier = {
      ...cheapPowerUp,
      id: "power-up-2",
      name: "Iron Will II",
      requiredPowerUpId: cheapPowerUp.id,
    };
    givenCatalog({ coins: 1000 });
    service.listPowerUps.mockResolvedValue([cheapPowerUp, nextTier]);

    const { unmount } = render(<StorePage />);

    expect(
      await screen.findByRole("button", { name: "Buy Iron Will first" }),
    ).toBeDisabled();

    unmount();
    service.ownedPowerUps.mockResolvedValue([cheapPowerUp]);

    render(<StorePage />);

    expect(
      await screen.findByRole("button", { name: "✓ Owned" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Buy Iron Will first" }),
    ).not.toBeInTheDocument();
  });

  it("refuses an item the balance cannot cover", async () => {
    givenCatalog({ coins: 100 });

    render(<StorePage />);

    const button = await screen.findByRole("button", {
      name: "Not enough coins",
    });

    expect(button).toBeDisabled();
  });

  it("marks an item the user already owns", async () => {
    givenCatalog({ ownedPowerUpIds: [cheapPowerUp.id] });

    render(<StorePage />);

    const button = await screen.findByRole("button", { name: "✓ Owned" });

    expect(button).toBeDisabled();
    expect(button.closest("li")).toHaveClass("border-emerald-500/70");
    expect(
      screen.getByRole("button", { name: "Not enough coins" }).closest("li"),
    ).toHaveClass("border-slate-800");
  });

  it("purchases and reports the remaining balance", async () => {
    givenCatalog();
    service.purchasePowerUp.mockResolvedValue({
      message: "Power-up purchased successfully",
      remainingCoins: 50,
    });

    render(<StorePage />);

    await userEvent.click(await screen.findByRole("button", { name: "Buy" }));

    expect(service.purchasePowerUp).toHaveBeenCalledWith(cheapPowerUp.id);

    const notice = await screen.findByRole("status");

    expect(notice).toHaveTextContent("Iron Will purchased. 50 coins left.");
  });

  it("announces a failed purchase instead of only coloring it red", async () => {
    givenCatalog();
    service.purchasePowerUp.mockRejectedValue(
      new ApiError("Not enough coins", 402),
    );

    render(<StorePage />);

    await userEvent.click(await screen.findByRole("button", { name: "Buy" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Not enough coins");
  });

  it("falls back to the no-art icon for an item without art", async () => {
    givenCatalog();

    const { container } = render(<StorePage />);

    await screen.findByText("Knight");

    const sources = Array.from(container.querySelectorAll("img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(sources).toContain("/assets/catalog/iron-will.png");
    expect(sources).toContain(`${import.meta.env.BASE_URL}no-art.svg`);
  });

  it("falls back to the no-art icon when the art does not load", async () => {
    givenCatalog();

    const { container } = render(<StorePage />);

    await screen.findByText("Knight");

    const art = Array.from(container.querySelectorAll("img")).find(
      (image) => image.getAttribute("src") === "/assets/catalog/iron-will.png",
    );

    fireEvent.error(art!);

    expect(art).toHaveAttribute("src", `${import.meta.env.BASE_URL}no-art.svg`);
  });

  it("does not reassign the fallback over itself", async () => {
    givenCatalog();

    const { container } = render(<StorePage />);

    await screen.findByText("Knight");

    const missing = Array.from(container.querySelectorAll("img")).find(
      (image) =>
        image.getAttribute("src") === `${import.meta.env.BASE_URL}no-art.svg`,
    );

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src",
    )!;

    const setSrc = vi.fn(descriptor.set);

    Object.defineProperty(missing!, "src", { ...descriptor, set: setSrc });

    fireEvent.error(missing!);

    expect(setSrc).not.toHaveBeenCalled();
  });

  it("takes the loaded catalog as proof that the cookie is valid", async () => {
    givenCatalog();

    render(<StorePage />);

    expect(await screen.findByText("Sessão ativa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Store" })).toBeInTheDocument();
  });

  it("claims no session while the catalog has not answered", () => {
    givenCatalogThatNeverAnswers();

    render(<StorePage />);

    expect(screen.queryByText("Sessão ativa")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Store" })).toBeDisabled();
  });

  it("claims no session when the store answers with an error", async () => {
    givenCatalog();
    service.listPowerUps.mockRejectedValue(new ApiError("Bad gateway", 502));

    render(<StorePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Bad gateway");
    expect(screen.queryByText("Sessão ativa")).not.toBeInTheDocument();
  });

  it("sends an expired session back to auth instead of showing an error", async () => {
    givenCatalog();
    service.listPowerUps.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<StorePage />);

    await waitFor(() => {
      expect(redirectToAuth).toHaveBeenCalled();
    });
  });
});
