import type { ReactNode } from "react";
import { FrontendMenu } from "./Menu";
import { useAuth } from "../../contexts/useAuth";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">DungeonBox</h1>
            <p className="text-sm text-slate-400">Distributed game platform</p>
          </div>

          <div className="flex items-center gap-4">
            <FrontendMenu />

            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">Sessão ativa</span>

                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
