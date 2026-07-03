import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  icon: Icon,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "border border-accent/20 bg-gradient-to-r from-accent to-accent-secondary text-white shadow-[0_16px_40px_rgba(124,92,255,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(124,92,255,0.35)]",
    secondary:
      "border border-white/10 bg-bg-card text-white hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/6",
    ghost: "text-white/70 hover:bg-white/5 hover:text-white",
    danger: "border border-red-500/20 bg-red-500/10 text-red-400 hover:-translate-y-0.5 hover:bg-red-500/20",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </motion.button>
  );
}
