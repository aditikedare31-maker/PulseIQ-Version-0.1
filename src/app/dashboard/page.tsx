import Link from "next/link";

export default function DashboardPage() {
  return (
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
          Dashboard
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Welcome to PulseIQ
        </h1>

        <p className="mt-3 max-w-2xl text-slate-300">
          This will become the main analytics dashboard for restaurant owners.
        </p>
        <br />
        <Link
            href="/signin"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white"
        >
            Sign In
        </Link>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Revenue</p>
            <p className="mt-2 text-3xl font-bold">₹1,25,000</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Orders</p>
            <p className="mt-2 text-3xl font-bold">230</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Avg Order Value</p>
            <p className="mt-2 text-3xl font-bold">₹543</p>
          </div>
          
        </div>
      </section>
  );
}