import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required')
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

const serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function expectErrorMessage(error: { message?: string } | null, expectedSnippet: string) {
  if (!error?.message?.includes(expectedSnippet)) {
    throw error ?? new Error(`Expected an error containing "${expectedSnippet}"`)
  }
}

async function main() {
  let cleanupErrorMessage: string | null = null
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

  const { error: draftVoteError } = await anonClient.from('votes').insert({
    question_id: session.current_question_id,
    participant_id: 'phase-0-verifier',
    value: { optionIdx: 0 },
  })

  expectErrorMessage(draftVoteError, 'session is not live')

  const temporarySessionCode = `${Math.floor(100000 + Math.random() * 900000)}`
  let temporarySessionId: string | null = null

  try {
    const { data: temporarySession, error: temporarySessionError } = await serviceClient
      .from('sessions')
      .insert({
        code: temporarySessionCode,
        state: 'live',
        voting_open: true,
        results_hidden: false,
        question_cycle_started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (temporarySessionError || !temporarySession) {
      throw temporarySessionError ?? new Error('Failed to create a temporary live session')
    }

    temporarySessionId = temporarySession.id

    const { data: temporaryQuestions, error: temporaryQuestionsError } = await serviceClient
      .from('questions')
      .insert([
        {
          session_id: temporarySession.id,
          type: 'open_ended',
          title: 'Open-ended guardrail check',
          order_index: 0,
          config: { maxLength: 40 },
        },
        {
          session_id: temporarySession.id,
          type: 'word_cloud',
          title: 'Single word-cloud submission check',
          order_index: 1,
          config: { allowMultipleSubmissions: false },
        },
      ])
      .select('id, type')

    if (temporaryQuestionsError || !temporaryQuestions) {
      throw temporaryQuestionsError ?? new Error('Failed to create temporary questions')
    }

    const openEndedQuestionId = temporaryQuestions.find((question) => question.type === 'open_ended')?.id
    const wordCloudQuestionId = temporaryQuestions.find((question) => question.type === 'word_cloud')?.id

    if (!openEndedQuestionId || !wordCloudQuestionId) {
      throw new Error('Temporary questions were not created correctly')
    }

    const { error: longResponseError } = await anonClient.from('votes').insert({
      question_id: openEndedQuestionId,
      participant_id: 'phase-0-verifier',
      value: { text: 'x'.repeat(41) },
    })

    expectErrorMessage(longResponseError, 'response is too long')

    const { error: firstWordError } = await anonClient.from('votes').insert({
      question_id: wordCloudQuestionId,
      participant_id: 'phase-0-verifier',
      value: { word: 'alpha' },
    })

    if (firstWordError) {
      throw firstWordError
    }

    const { error: secondWordError } = await anonClient.from('votes').insert({
      question_id: wordCloudQuestionId,
      participant_id: 'phase-0-verifier',
      value: { word: 'beta' },
    })

    if (secondWordError) {
      throw secondWordError
    }

    const { data: wordCloudVotes, error: wordCloudVotesError } = await serviceClient
      .from('votes')
      .select('value')
      .eq('question_id', wordCloudQuestionId)
      .eq('participant_id', 'phase-0-verifier')

    if (wordCloudVotesError) {
      throw wordCloudVotesError
    }

    const latestWord =
      wordCloudVotes[0]?.value && typeof wordCloudVotes[0].value === 'object' && 'word' in wordCloudVotes[0].value
        ? wordCloudVotes[0].value.word
        : null

    if (wordCloudVotes.length !== 1 || latestWord !== 'beta') {
      throw new Error('Single-submit word cloud did not retain only the latest response')
    }
  } finally {
    if (temporarySessionId) {
      const { error } = await serviceClient.from('sessions').delete().eq('id', temporarySessionId)
      if (error) {
        cleanupErrorMessage = error.message
      }
    }
  }

  if (cleanupErrorMessage) {
    throw new Error(cleanupErrorMessage)
  }

  console.log('Anonymous vote select denied as expected.')
  console.log('Draft sessions reject anonymous votes as expected.')
  console.log('Open-ended maxLength is enforced by the database.')
  console.log('Single-submit word clouds retain only the latest participant response.')
  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
