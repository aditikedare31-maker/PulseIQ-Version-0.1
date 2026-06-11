import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl rounded-3xl border border-border bg-card p-8 shadow-lg text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
