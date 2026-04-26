import { useTheme } from '../lib/themeContext'

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CONFIG: Record<LogoSize, { icon: number; font: number; gap: number; radius: number }> = {
  xs: { icon: 18, font: 12, gap: 5, radius: 3 },
  sm: { icon: 26, font: 16, gap: 7, radius: 6 },
  md: { icon: 34, font: 21, gap: 9, radius: 8 },
  lg: { icon: 48, font: 28, gap: 12, radius: 10 },
  xl: { icon: 68, font: 40, gap: 16, radius: 14 },
}

const BAR_HEIGHTS = [0.44, 1, 0.66] as const

export function MentiLogo({
  size = 'md',
  creator = false,
}: {
  size?: LogoSize
  creator?: boolean
}) {
  const { theme } = useTheme()
  const { icon, font, gap, radius } = SIZE_CONFIG[size]
  const textColor = creator ? theme.creatorText : theme.text1
  const padding = Math.round(icon * 0.17)
  const innerGap = Math.round(icon * 0.07)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <div
        aria-hidden="true"
        style={{
          width: icon,
          height: icon,
          borderRadius: radius,
          background: theme.accent,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding,
          gap: innerGap,
          flexShrink: 0,
        }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              background: theme.accentFg,
              borderRadius: 2,
              opacity: h === 1 ? 1 : 0.72,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: font,
          fontWeight: 800,
          color: textColor,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        menti
      </span>
    </div>
  )
}
