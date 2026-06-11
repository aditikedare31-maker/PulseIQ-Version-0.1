import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 p-6 md:block">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
              PulseIQ
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Restaurant Intelligence
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/orders"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Orders
            </Link>

            <Link
              href="/dashboard/inventory"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Inventory
            </Link>

            <Link
              href="/dashboard/menu"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Menu
            </Link>

            <Link
              href="/dashboard/customers"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Customers
            </Link>

            <Link
              href="/dashboard/settings"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Settings
            </Link>
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Workspace</p>
                <h2 className="font-semibold">PulseIQ Demo Restaurant</h2>
              </div>

              <Link
                href="/signin"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Sign out
              </Link>
            </div>
          </header>

          <div className="min-w-0 flex-1 p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
