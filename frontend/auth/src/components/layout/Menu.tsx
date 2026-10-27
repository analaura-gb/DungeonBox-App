import { useAuth } from "../../contexts/useAuth";

const items = [
  { label: "Auth", href: "/auth/", protected: false },
  { label: "Store", href: "/store/", protected: true },
  { label: "Ranking", href: "/ranking/", protected: true },
  { label: "Game", href: "/game/", protected: true },
];

export function FrontendMenu() {
  const currentPath = window.location.pathname;
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <nav className="flex gap-3">
      {items.map((item) => {
        const active = currentPath.startsWith(item.href);
        const disabled = item.protected && (!isAuthenticated || isLoading);

        if (disabled) {
          return (
            <button
              key={item.href}
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
            key={item.href}
            href={item.href}
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
