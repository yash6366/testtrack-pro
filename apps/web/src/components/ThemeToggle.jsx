import { useTheme } from '@/hooks';

const SIZE_STYLES = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function ThemeToggle({ size = 'sm' }) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`tt-btn tt-btn-outline ${SIZE_STYLES[size] || SIZE_STYLES.sm}`}
      aria-label={`Switch to ${nextLabel} mode`}
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-[var(--primary)]"></span>
      <span className="font-semibold tracking-wide">{nextLabel} mode</span>
    </button>
  );
}
