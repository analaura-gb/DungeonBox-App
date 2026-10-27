import { MainLayout } from "../../components/layout/MainLayout";
import { Link } from "react-router";

export function WelcomePage() {
  return (
    <MainLayout>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Welcome
          </span>

          <h2 className="mt-4 text-3xl font-bold text-white">
            Welcome to DungeonBox
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-300">
            DungeonBox is a distributed game platform designed to run multiple
            frontend and backend services across TV Boxes. This authentication
            area is your entry point to the platform, allowing you to access the
            system securely before using features such as the game, store, and
            ranking services.
          </p>

          <p className="mt-4 text-base leading-7 text-slate-400">
            Sign in if you already have an account, or create a new one to get
            started and explore the DungeonBox ecosystem.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-amber-500 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-amber-600"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-center font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              Sign up
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
