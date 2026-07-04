export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-9 text-center sm:py-14">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_18px_48px_rgba(2,6,23,0.28)] sm:h-14 sm:w-14">
          <Icon className="h-6 w-6 text-white/55" />
        </div>
      )}
      <h3 className="mb-2 text-balance text-base font-semibold text-white sm:text-lg">{title}</h3>
      {description && <p className="mb-5 max-w-md text-balance text-sm leading-6 text-white/52">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-xl border border-accent/20 bg-accent/14 px-4 py-2.5 text-sm font-medium text-accent transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
