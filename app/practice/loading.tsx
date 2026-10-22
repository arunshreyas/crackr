export default function PracticeLoading() {
  return (
    <main className="min-h-screen bg-[#080A0E] text-zinc-100 p-6 sm:p-10" aria-busy="true">
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="h-10 w-64 rounded-lg bg-white/[0.06]" />
        <div className="h-72 rounded-2xl bg-white/[0.06]" />
        <p className="text-sm text-zinc-500">Loading practice…</p>
      </div>
    </main>
  );
}
