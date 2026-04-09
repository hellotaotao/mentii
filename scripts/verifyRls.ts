import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
}

const anonClient = createClient<Database>(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'x-participant-id': 'phase-0-verifier',
    },
  },
})

async function main() {
  const { error: voteSelectError } = await anonClient.from('votes').select('*').limit(1)

  if (!voteSelectError) {
    throw new Error('Anonymous vote selection unexpectedly succeeded')
  }

  const { data: session, error: sessionError } = await anonClient
    .from('sessions')
    .select('current_question_id')
    .eq('code', '482176')
    .single()

  if (sessionError || !session?.current_question_id) {
    throw sessionError ?? new Error('Seeded session was not found')
  }

  const { data: results, error: rpcError } = await anonClient.rpc('get_question_results', {
    target_question_id: session.current_question_id,
  })

  if (rpcError) {
    throw rpcError
  }

  console.log('Anonymous vote select denied as expected.')
  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
