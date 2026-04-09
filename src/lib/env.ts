export type EnvSource = Record<string, string | undefined>

export function getRequiredEnv(source: EnvSource, key: string) {
  const value = source[key]

  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

export function getBrowserEnv(source: EnvSource = import.meta.env as EnvSource) {
  return {
    supabaseUrl: getRequiredEnv(source, 'VITE_SUPABASE_URL'),
    supabaseAnonKey: getRequiredEnv(source, 'VITE_SUPABASE_ANON_KEY'),
  } as const
}
