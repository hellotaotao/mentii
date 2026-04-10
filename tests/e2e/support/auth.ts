import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../../../src/types/database'

dotenv.config({ path: '.env.local' })

function requireEnv(name: 'SUPABASE_SERVICE_ROLE_KEY' | 'VITE_SUPABASE_URL') {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set in .env.local before running Playwright tests.`)
  }

  return value
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const adminSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function createUniqueEmail() {
  return `mentii-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

export async function createHostMagicLink(baseURL: string) {
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: createUniqueEmail(),
    options: {
      redirectTo: `${baseURL}/host/new`,
    },
  })

  if (error || !data?.properties.action_link) {
    throw error ?? new Error('Failed to generate a host magic link for Playwright.')
  }

  return data.properties.action_link
}
