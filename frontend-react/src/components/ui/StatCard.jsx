import { motion } from "framer-motion";

export default function StatCard({ label, value, icon: Icon, trend, onClick }) {
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass w-full rounded-2xl p-4 text-left ${
        onClick ? "interactive-card cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/52">{label}</span>
        {Icon ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
            <Icon className="h-4 w-4 text-white/45" />
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">{value}</span>
        {trend !== undefined && trend !== null && (
          <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? "+" : ""}
            {trend}
          </span>
        )}
      </div>
    </Wrapper>
  );
}
