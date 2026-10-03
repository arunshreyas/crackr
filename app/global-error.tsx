'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080A0E] text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full space-y-5">
          <h1 className="text-xl font-bold text-white">Application Error</h1>
          <p className="text-xs text-zinc-400">
            A critical error occurred while loading the application.
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold transition-all cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
