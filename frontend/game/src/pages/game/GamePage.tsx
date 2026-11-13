import { lazy, Suspense } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { useAuth } from "../../contexts/useAuth";

const GameView = lazy(() =>
  import("../../components/game/GameView").then((m) => ({ default: m.GameView })),
);

export function GamePage() {
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

            <h2 className="mt-4 text-3xl font-bold text-white">
              Sign in to play
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-400">
              The game is available to signed-in players only. Sign in or
              create an account to start your run.
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
      <div className="relative flex min-h-[max(420px,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border border-slate-800 shadow-xl sm:min-h-[max(480px,calc(100dvh-10rem))]">
        <Suspense
          fallback={
            <p className="p-8 text-center text-sm text-slate-400">Loading game...</p>
          }
        >
          <GameView />
        </Suspense>
      </div>
    </MainLayout>
  );
}
