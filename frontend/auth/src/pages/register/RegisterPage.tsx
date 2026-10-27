import { useState } from "react";
import { Link } from "react-router";
import { MainLayout } from "../../components/layout/MainLayout";
import { useAuth } from "../../contexts/useAuth";

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [securityCode, setSecurityCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({ name, email, password });
      setSecurityCode(response.securityCode);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError("Could not register user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopySecurityCode() {
    try {
      await navigator.clipboard.writeText(securityCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
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

  if (securityCode) {
    return (
      <MainLayout>
        <section className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Security code
            </span>

            <h2 className="mt-4 text-3xl font-bold text-white">
              Save your security code
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-400">
              You will need this code if you forget your password. For security
              reasons, this code will only be shown once.
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-4">
              <p className="flex-1 text-center font-mono text-lg font-bold tracking-widest text-amber-400">
                {securityCode}
              </p>

              <button
                type="button"
                onClick={handleCopySecurityCode}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <Link
              to="/login"
              className="mt-8 inline-flex w-full justify-center rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-600"
            >
              I saved my code
            </Link>
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
            Sign up
          </span>

          <h2 className="mt-4 text-3xl font-bold text-white">
            Create your account
          </h2>

          <p className="mt-3 text-base leading-7 text-slate-400">
            Register to start using DungeonBox services.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-200"
              >
                Username
              </label>

              <input
                id="name"
                type="text"
                placeholder="Choose a username"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

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
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-slate-200"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-amber-400 transition hover:text-amber-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
