export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#080A0E] text-zinc-100 p-6 sm:p-10" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-56 rounded-lg bg-white/[0.06]" />
        <div className="h-40 rounded-2xl bg-white/[0.06]" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 rounded-2xl bg-white/[0.06]" />
          <div className="h-48 rounded-2xl bg-white/[0.06]" />
        </div>
        <p className="text-sm text-zinc-500">Loading your dashboard…</p>
      </div>
    </main>
  );
}
