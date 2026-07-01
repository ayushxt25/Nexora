import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass rounded-2xl p-6 ${
        hover ? "transition-all duration-300 hover:border-white/20 hover:-translate-y-1" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}