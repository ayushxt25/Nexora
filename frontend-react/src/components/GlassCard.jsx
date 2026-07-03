import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5 lg:p-6 ${
        hover ? "interactive-card" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
