import type { TablesUpdate } from '../types/database'
import {
  createDefaultQuestionConfig,
  createDefaultQuestionTitle,
  mapQuestionRow,
  parseQuestionResults,
  type EditorQuestion,
  type QuestionResults,
  type QuestionType,
  type SessionEditorData,
} from '../types/questions'
import { getParticipantId } from './participantId'
import { generateSessionCode, normalizeSessionCode } from './sessionCode'
import { getSupabaseClient } from './supabase'

const MAX_SESSION_CODE_ATTEMPTS = 10

export type UpdateQuestionInput = Pick<TablesUpdate<'questions'>, 'title'> & {
  config: EditorQuestion['config']
}

export type UpdateSessionInput = Pick<
  TablesUpdate<'sessions'>,
  'current_question_id' | 'question_cycle_started_at' | 'results_hidden' | 'state' | 'voting_open'
>

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

async function getSessionRow(sessionId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Session not found.')
  }

  return data
}

async function getSessionRowByCode(sessionCode: string) {
  const normalizedCode = normalizeSessionCode(sessionCode)

  if (!normalizedCode) {
    throw new Error('Session code is required.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('sessions').select('*').eq('code', normalizedCode).single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Session not found.')
  }

  return data
}

async function listQuestionRows(sessionId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

async function createQuestionRow(sessionId: string, type: QuestionType, orderIndex: number) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('questions')
    .insert({
      config: createDefaultQuestionConfig(type),
      order_index: orderIndex,
      session_id: sessionId,
      title: createDefaultQuestionTitle(type),
      type,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Question creation did not return a row.')
  }

  return data
}

export async function createSessionWithDefaultQuestion(hostId: string) {
  const supabase = getSupabaseClient()

  for (let attempt = 0; attempt < MAX_SESSION_CODE_ATTEMPTS; attempt += 1) {
    const { data: sessionRow, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        code: generateSessionCode(),
        host_id: hostId,
        results_hidden: false,
        state: 'draft',
        voting_open: true,
      })
      .select('*')
      .single()

    if (sessionError) {
      if (sessionError.code === '23505') {
        continue
      }

      throw new Error(sessionError.message)
    }

    if (!sessionRow) {
      throw new Error('Session creation did not return a row.')
    }

    try {
      const questionRow = await createQuestionRow(sessionRow.id, 'multiple_choice', 0)
      const { error: updateSessionError } = await supabase
        .from('sessions')
        .update({
          current_question_id: questionRow.id,
        })
        .eq('id', sessionRow.id)

      if (updateSessionError) {
        throw new Error(updateSessionError.message)
      }

      return {
        sessionId: sessionRow.id,
      }
    } catch (error) {
      const { error: cleanupError } = await supabase.from('sessions').delete().eq('id', sessionRow.id)

      if (cleanupError) {
        throw new Error(
          `Cleanup failed (${cleanupError.message}) after original error: ${getErrorMessage(
            error,
            'Failed to create the default question.',
          )}`,
        )
      }

      throw new Error(getErrorMessage(error, 'Failed to create the default question.'))
    }
  }

  throw new Error('Unable to generate a unique session code.')
}

export async function getSessionEditorData(sessionId: string): Promise<SessionEditorData> {
  const [session, questionRows] = await Promise.all([getSessionRow(sessionId), listQuestionRows(sessionId)])

  return {
    questions: questionRows.map(mapQuestionRow),
    session,
  }
}

export async function getSessionByCode(sessionCode: string): Promise<SessionEditorData> {
  const session = await getSessionRowByCode(sessionCode)
  const questionRows = await listQuestionRows(session.id)

  return {
    questions: questionRows.map(mapQuestionRow),
    session,
  }
}

export async function createQuestion(sessionId: string, type: QuestionType = 'multiple_choice') {
  const [session, questionRows] = await Promise.all([getSessionRow(sessionId), listQuestionRows(sessionId)])
  const questionRow = await createQuestionRow(sessionId, type, questionRows.length)
  const supabase = getSupabaseClient()

  if (!session.current_question_id) {
    const { error } = await supabase
      .from('sessions')
      .update({
        current_question_id: questionRow.id,
      })
      .eq('id', sessionId)
      .is('current_question_id', null)

    if (error) {
      throw new Error(error.message)
    }
  }

  return mapQuestionRow(questionRow)
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('questions')
    .update({
      config: input.config,
      title: input.title,
    })
    .eq('id', questionId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getQuestionResults(question: EditorQuestion): Promise<QuestionResults> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_question_results', {
    target_question_id: question.id,
  })

  if (error) {
    throw new Error(error.message)
  }

  return parseQuestionResults(question, data ?? {})
}

export async function submitMultipleChoiceVote(questionId: string, optionIdx: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('votes').insert({
    participant_id: getParticipantId(),
    question_id: questionId,
    value: {
      optionIdx,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitWordCloudVote(questionId: string, word: string) {
  const trimmedWord = word.trim()

  if (!trimmedWord) {
    throw new Error('A word is required.')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('votes').insert({
    participant_id: getParticipantId(),
    question_id: questionId,
    value: {
      word: trimmedWord,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitOpenEndedVote(questionId: string, text: string) {
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new Error('A response is required.')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('votes').insert({
    participant_id: getParticipantId(),
    question_id: questionId,
    value: {
      text: trimmedText,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitScalesVote(questionId: string, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('A rating between 1 and 5 is required.')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('votes').insert({
    participant_id: getParticipantId(),
    question_id: questionId,
    value: {
      rating,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitQAndAEntry(questionId: string, text: string) {
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new Error('A question is required.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('submit_q_and_a_entry', {
    entry_text: trimmedText,
    target_question_id: questionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function upvoteQAndAEntry(entryId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('upvote_q_and_a_entry', {
    target_entry_id: entryId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function setQAndAEntryAnswered(entryId: string, nextAnswered: boolean) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('set_q_and_a_entry_answered', {
    next_answered: nextAnswered,
    target_entry_id: entryId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitQuizVote(questionId: string, optionIdx: number) {
  if (!Number.isInteger(optionIdx) || optionIdx < 0) {
    throw new Error('A quiz answer is required.')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('votes').insert({
    participant_id: getParticipantId(),
    question_id: questionId,
    value: {
      optionIdx,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateSession(sessionId: string, input: UpdateSessionInput) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('sessions').update(input).eq('id', sessionId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function resetQuestionResults(questionId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('reset_question_results', {
    target_question_id: questionId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function reorderQuestions(sessionId: string, questionIds: string[]) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('reorder_questions', {
    ordered_question_ids: questionIds,
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteQuestion(sessionId: string, questionId: string) {
  const supabase = getSupabaseClient()
  const [session, questionRows] = await Promise.all([getSessionRow(sessionId), listQuestionRows(sessionId)])

  if (questionRows.length <= 1) {
    throw new Error('A session must keep at least one slide.')
  }

  const deletedQuestion = questionRows.find((question) => question.id === questionId)
  if (!deletedQuestion) {
    throw new Error('Question not found.')
  }

  const remainingQuestionRows = questionRows.filter((question) => question.id !== questionId)

  if (session.current_question_id === questionId) {
    const nextCurrentQuestion =
      remainingQuestionRows.find((question) => question.order_index >= deletedQuestion.order_index) ??
      remainingQuestionRows[remainingQuestionRows.length - 1]

    const { error: updateSessionError } = await supabase
      .from('sessions')
      .update({
        current_question_id: nextCurrentQuestion?.id ?? null,
      })
      .eq('id', sessionId)

    if (updateSessionError) {
      throw new Error(updateSessionError.message)
    }
  }

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
    .eq('session_id', sessionId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  await reorderQuestions(
    sessionId,
    remainingQuestionRows
      .sort((leftQuestion, rightQuestion) => leftQuestion.order_index - rightQuestion.order_index)
      .map((question) => question.id),
  )
}
