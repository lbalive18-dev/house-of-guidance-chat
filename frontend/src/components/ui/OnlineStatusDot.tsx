export default function OnlineStatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-surface-dark ${
        online ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      aria-label={online ? 'Online' : 'Offline'}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
