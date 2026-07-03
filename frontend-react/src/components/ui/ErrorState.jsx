import { AlertCircle } from "lucide-react";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/18 bg-red-500/10 shadow-[0_18px_48px_rgba(127,29,29,0.18)]">
        <AlertCircle className="h-6 w-6 text-red-300" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">Something went wrong</h3>
      <p className="mb-5 max-w-md text-balance text-sm leading-6 text-white/52">
        {message || "That request didn't go through. Try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
