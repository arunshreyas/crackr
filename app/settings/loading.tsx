export default function SettingsLoading() {
  return (
    <main className="min-h-screen bg-[#080A0E] text-zinc-100 p-6 sm:p-10" aria-busy="true">
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-lg bg-white/[0.06]" />
        <div className="h-64 rounded-2xl bg-white/[0.06]" />
        <p className="text-sm text-zinc-500">Loading settings…</p>
      </div>
    </main>
  );
}
