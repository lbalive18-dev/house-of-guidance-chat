import OnlineStatusDot from '@/components/ui/OnlineStatusDot';

interface AvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

function initials(name?: string | null): string {
  return (name ?? 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name, avatarUrl, size = 'md', showOnline, isOnline }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? 'User'}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-surface-dark`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 ring-2 ring-white dark:bg-primary-900/40 dark:text-primary-200 dark:ring-surface-dark`}
        >
          {initials(name)}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0">
          <OnlineStatusDot online={!!isOnline} />
        </span>
      )}
    </div>
  );
}