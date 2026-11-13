import { useState, type ReactNode } from "react";
import { FrontendMenu } from "./Menu";
import { sessionService } from "../../services/SessionService";
import { redirectToAuth } from "../../app/navigation";

type MainLayoutProps = {
  children: ReactNode;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export function MainLayout({
  children,
  isAuthenticated,
  isLoading,
}: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await sessionService.logout().catch(() => undefined);

    redirectToAuth();
  }

  const session = isAuthenticated && (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300">Sessão ativa</span>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
      >
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h1 className="text-xl font-bold text-white">DungeonBox</h1>
            <p className="text-sm text-slate-400">Distributed game platform</p>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <FrontendMenu
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
            />

            {session}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-100 transition hover:bg-slate-800 md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-slate-800 px-4 py-4 md:hidden">
            <FrontendMenu
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
              vertical
            />

            {session}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
