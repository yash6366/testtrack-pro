/**
 * MuteBanner - Shows when user is muted with countdown
 */
export default function MuteBanner({ mutedUntil, muteReason }) {
  if (!mutedUntil) return null;

  const muteDate = new Date(mutedUntil);
  const now = new Date();
  const timeRemaining = muteDate - now;

  if (timeRemaining <= 0) return null;

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔇</span>
        <div>
          <p className="font-semibold text-amber-600 dark:text-amber-300">You are muted</p>
          <p className="text-sm text-amber-600/80 dark:text-amber-300/80">
            You cannot send messages for the next{' '}
            {hours > 0 && `${hours}h `}
            {minutes}m
          </p>
        </div>
      </div>
      {muteReason && (
        <p className="text-sm text-amber-600/70 dark:text-amber-300/70 ml-8">
          Reason: <em>{muteReason}</em>
        </p>
      )}
    </div>
  );
}
