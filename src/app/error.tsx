"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl rounded-3xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          We couldn&apos;t load this page
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          Please try again. If the issue continues, check the console and server logs.
        </p>

        {process.env.NODE_ENV === "development" ? (
          <div className="mt-4 rounded-lg bg-muted p-3 font-mono text-xs text-red-600 overflow-auto max-h-32">
            {error.message}
          </div>
        ) : null}

        <button
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
