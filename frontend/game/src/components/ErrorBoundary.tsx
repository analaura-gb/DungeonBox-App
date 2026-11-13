import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Unhandled error in the interface",
      error,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div
          role="alert"
          className="flex max-w-md flex-col gap-4 rounded-2xl border border-slate-800 bg-[#131A2A] p-8 text-center shadow-xl"
        >
          <h1 className="text-2xl font-bold text-white">Something broke</h1>

          <p className="text-sm leading-6 text-slate-400">
            This screen could not be rendered. Reloading usually solves it; if
            it does not, the service may be unavailable.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-600"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
