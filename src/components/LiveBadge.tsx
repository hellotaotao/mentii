import { useTheme } from '../lib/themeContext'

export function LiveBadge({ count }: { count: number }) {
  const { theme } = useTheme()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: `${theme.live}14`,
        border: `1px solid ${theme.live}28`,
        borderRadius: 100,
        padding: '5px 12px',
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: theme.live,
          animation: 'mentii-live-pulse 1.6s ease-in-out infinite',
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: theme.live }}>
        {count} voting
      </span>
    </div>
  )
}
