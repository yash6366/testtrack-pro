export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  return (
    <div className="tt-card p-8 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-[var(--primary)]" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--muted)] mt-2">{description}</p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actionLabel && (
            <button
              onClick={onAction}
              className="tt-btn tt-btn-primary px-5 py-2"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button
              onClick={onSecondaryAction}
              className="tt-btn tt-btn-secondary px-5 py-2"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
