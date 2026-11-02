import { useAuth } from "../../contexts/useAuth";

const items = [
  {
    label: "Auth",
    path: "/auth/",
    url: import.meta.env.VITE_AUTH_URL,
    protected: false,
  },
  {
    label: "Store",
    path: "/store/",
    url: import.meta.env.VITE_STORE_URL,
    protected: true,
  },
  {
    label: "Ranking",
    path: "/ranking/",
    url: import.meta.env.VITE_RANKING_URL,
    protected: true,
  },
  {
    label: "Game",
    path: "/game/",
    url: import.meta.env.VITE_GAME_URL,
    protected: true,
  },
];

export function FrontendMenu() {
  const currentPath = window.location.pathname;
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <nav className="flex gap-3">
      {items.map((item) => {
        const active = currentPath.startsWith(item.path);
        const disabled = item.protected && (!isAuthenticated || isLoading);

        if (disabled) {
          return (
            <button
              key={item.path}
              type="button"
              disabled
              title="Sign in to access this area"
              className="cursor-not-allowed rounded-xl px-4 py-2 text-sm font-medium text-slate-500 opacity-60"
            >
              {item.label}
            </button>
          );
        }

        return (
          <a
            key={item.path}
            href={item.url}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-100 hover:bg-slate-800"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
