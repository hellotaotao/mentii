import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  const sessionCode = '482176'

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .upsert(
      {
        code: sessionCode,
        state: 'draft',
        voting_open: true,
        results_hidden: false,
      },
      { onConflict: 'code' },
    )
    .select('id')
    .single()

  if (sessionError || !session) {
    throw sessionError ?? new Error('Failed to create demo session')
  }

  const questions: Database['public']['Tables']['questions']['Insert'][] = [
    {
      session_id: session.id,
      type: 'multiple_choice',
      title: 'Which teamwork value matters most?',
      order_index: 0,
      config: {
        chartType: 'bar',
        options: ['Clarity', 'Speed', 'Ownership', 'Trust'],
      },
    },
    {
      session_id: session.id,
      type: 'word_cloud',
      title: 'What word describes a great retro?',
      order_index: 1,
      config: {
        allowMultipleSubmissions: true,
      },
    },
  ]

  const { data: insertedQuestions, error: questionError } = await supabase
    .from('questions')
    .upsert(questions, { onConflict: 'session_id,order_index' })
    .select('id, order_index')

  if (questionError || !insertedQuestions) {
    throw questionError ?? new Error('Failed to create demo questions')
  }

  const firstQuestion = insertedQuestions.find((question) => question.order_index === 0)
  if (!firstQuestion) {
    throw new Error('Failed to find the first seeded question')
  }

  const { error: sessionUpdateError } = await supabase
    .from('sessions')
    .update({
      current_question_id: firstQuestion.id,
      question_cycle_started_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (sessionUpdateError) {
    throw sessionUpdateError
  }

  console.log(`Seeded demo session ${sessionCode} with ${insertedQuestions.length} questions.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
