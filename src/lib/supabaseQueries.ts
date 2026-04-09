import type { TablesUpdate } from '../types/database'
import {
  createDefaultQuestionConfig,
  createDefaultQuestionTitle,
  mapQuestionRow,
  type EditorQuestion,
  type QuestionType,
  type SessionEditorData,
} from '../types/questions'
import { generateSessionCode } from './sessionCode'
import { getSupabaseClient } from './supabase'

const MAX_SESSION_CODE_ATTEMPTS = 10

export type UpdateQuestionInput = Pick<TablesUpdate<'questions'>, 'title'> & {
  config: EditorQuestion['config']
}

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

function reorderQuestionRows(
  questionRows: Awaited<ReturnType<typeof listQuestionRows>>,
  orderedQuestionIds: string[],
) {
  const questionRowById = new Map(questionRows.map((question) => [question.id, question]))
  const reorderedQuestionRows = orderedQuestionIds.map((questionId, index) => {
    const questionRow = questionRowById.get(questionId)

    if (!questionRow) {
      throw new Error(`Question ${questionId} was not found in this session.`)
    }

    return {
      ...questionRow,
      order_index: index,
    }
  })

  if (reorderedQuestionRows.length !== questionRows.length) {
    throw new Error('Reorder payload does not match the current slide set.')
  }

  return reorderedQuestionRows
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

export async function reorderQuestions(sessionId: string, questionIds: string[]) {
  const supabase = getSupabaseClient()
  const questionRows = await listQuestionRows(sessionId)
  const reorderedQuestionRows = reorderQuestionRows(questionRows, questionIds)
  const { error } = await supabase.from('questions').upsert(reorderedQuestionRows)

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
