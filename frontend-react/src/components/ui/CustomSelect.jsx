import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

const baseButtonClasses =
  "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:border-accent/50";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  icon: Icon,
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={`${baseButtonClasses} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${buttonClassName}`}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-white/35" /> : null}
        <span className="min-w-0 flex-1 truncate text-white/80">{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-[120] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[rgba(10,14,24,0.95)] p-1.5 shadow-[0_24px_80px_rgba(2,6,23,0.62)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(10,14,24,0.82)] ${menuClassName}`}
          >
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-accent/18 text-white"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
