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
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02]",
    secondary:
      "bg-bg-card border border-white/10 text-white hover:bg-white/5 hover:border-white/20",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
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