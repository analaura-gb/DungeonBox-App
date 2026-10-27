import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { MainLayout } from "../../components/layout/MainLayout";
import { useAuth } from "../../contexts/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return (
      <MainLayout>
        <section className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Active session
            </span>

            <h2 className="mt-4 text-3xl font-bold text-white">
              You are already logged in
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-400">
              If you want to switch accounts, click the logout button at the top
              of the page and then create or access another account.
            </p>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Sign in
          </span>

          <h2 className="mt-4 text-3xl font-bold text-white">
            Access your account
          </h2>

          <p className="mt-3 text-base leading-7 text-slate-400">
            Enter your credentials to continue to DungeonBox.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-200"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-200"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-amber-400 transition hover:text-amber-300"
            >
              Sign up
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              Forgot your password?{" "}
              <Link
                to="/reset-password"
                className="font-semibold text-amber-400 transition hover:text-amber-300"
              >
                Reset password
              </Link>
            </p>
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
