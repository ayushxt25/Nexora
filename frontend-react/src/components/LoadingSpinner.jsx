import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/60">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}