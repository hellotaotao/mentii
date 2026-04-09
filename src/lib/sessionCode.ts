const SESSION_CODE_LENGTH = 6

export function normalizeSessionCode(value: string) {
  return value.replace(/\D+/g, '').slice(0, SESSION_CODE_LENGTH)
}

export function formatSessionCode(code: string) {
  const normalizedCode = normalizeSessionCode(code)

  if (normalizedCode.length <= 4) {
    return normalizedCode
  }

  return `${normalizedCode.slice(0, 4)} ${normalizedCode.slice(4)}`
}

export function generateSessionCode(random: () => number = Math.random) {
  return Math.floor(random() * 1_000_000)
    .toString()
    .padStart(SESSION_CODE_LENGTH, '0')
}

export function buildJoinUrl(
  code: string,
  origin: string = typeof window === 'undefined' ? '' : window.location.origin,
) {
  return `${origin}/?code=${normalizeSessionCode(code)}`
}
