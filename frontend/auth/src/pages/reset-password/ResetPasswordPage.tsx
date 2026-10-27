import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { MainLayout } from "../../components/layout/MainLayout";
import { useAuth } from "../../contexts/useAuth";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        email,
        securityCode,
        newPassword,
      });

      setSuccess("Password reset successfully. You can now sign in.");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError("Could not reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <section className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#131A2A] p-8 shadow-xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Password reset
          </span>

          <h2 className="mt-4 text-3xl font-bold text-white">
            Reset your password
          </h2>

          <p className="mt-3 text-base leading-7 text-slate-400">
            Enter your account email and security code to create a new password.
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
                htmlFor="securityCode"
                className="text-sm font-medium text-slate-200"
              >
                Security code
              </label>

              <input
                id="securityCode"
                type="text"
                placeholder="DGBX-XXXX-XXXX-XXXX"
                value={securityCode}
                onChange={(event) => setSecurityCode(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-slate-200"
              >
                New password
              </label>

              <input
                id="newPassword"
                type="password"
                placeholder="Create a new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="confirmNewPassword"
                className="text-sm font-medium text-slate-200"
              >
                Confirm new password
              </label>

              <input
                id="confirmNewPassword"
                type="password"
                placeholder="Repeat your new password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {success && <p className="text-sm text-emerald-400">{success}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Resetting password..." : "Reset password"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Remember your password?{" "}
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
