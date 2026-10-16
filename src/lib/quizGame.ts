import type { Json } from '../types/database'
import type { EditorQuestion } from '../types/questions'
import { getSupabaseClient } from './supabase'

export type ParticipantProfile = {
  emoji: string
  nickname: string
  realName: string | null
}

export type QuizLeaderboardRow = {
  correctCount: number
  emoji: string
  lastPoints: number
  nickname: string
  participantId: string
  previousRank: number
  rank: number
  realName: string | null
  score: number
}

export type QuizLeaderboard = {
  entries: QuizLeaderboardRow[]
  totalPlayers: number
}

export type QuizCurrentAnswer = {
  answered: boolean
  correct: boolean | null
  correctOptionIdx: number | null
  optionIdx: number | null
  points: number | null
  questionId: string
  revealed: boolean
}

export type MyQuizStatus = ParticipantProfile & {
  currentAnswer: QuizCurrentAnswer | null
  rank: number
  score: number
  totalPlayers: number
}

export const PARTICIPANT_EMOJIS = ['🦊', '🐼', '🦉', '🐙', '🦄', '🐯', '🐸', '🐧', '🦁', '🐨', '🐳', '🦖'] as const

const NICKNAME_ADJECTIVES = [
  'Brave',
  'Sneaky',
  'Cosmic',
  'Fluffy',
  'Turbo',
  'Sleepy',
  'Mighty',
  'Funky',
  'Lucky',
  'Witty',
  'Zesty',
  'Jolly',
]

const EMOJI_ANIMAL_NAMES: Record<(typeof PARTICIPANT_EMOJIS)[number], string> = {
  '🦁': 'Lion',
  '🦄': 'Unicorn',
  '🦉': 'Owl',
  '🦊': 'Fox',
  '🦖': 'Dino',
  '🐙': 'Octopus',
  '🐧': 'Penguin',
  '🐨': 'Koala',
  '🐳': 'Whale',
  '🐸': 'Frog',
  '🐼': 'Panda',
  '🐯': 'Tiger',
}

function pickRandom<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length) % items.length]
}

export function suggestParticipantProfile(random: () => number = Math.random) {
  const emoji = pickRandom(PARTICIPANT_EMOJIS, random)

  return {
    emoji,
    nickname: `${pickRandom(NICKNAME_ADJECTIVES, random)} ${EMOJI_ANIMAL_NAMES[emoji]}`,
  }
}

export function roomUsesQuizGame(questions: EditorQuestion[]) {
  return questions.some((question) => question.type === 'quiz' || question.type === 'leaderboard')
}

function isRecord(value: Json | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: Json | undefined, fallbackValue = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallbackValue
}

function toNullableNumber(value: Json | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toNullableString(value: Json | undefined) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function parseParticipantProfile(value: Json | null | undefined): ParticipantProfile | null {
  const record = value ?? undefined

  if (!isRecord(record) || typeof record.nickname !== 'string') {
    return null
  }

  return {
    emoji: typeof record.emoji === 'string' ? record.emoji : '🙂',
    nickname: record.nickname,
    realName: toNullableString(record.realName),
  }
}

export function parseQuizLeaderboard(value: Json | null | undefined): QuizLeaderboard {
  if (!isRecord(value ?? undefined)) {
    return { entries: [], totalPlayers: 0 }
  }

  const record = value as Record<string, Json | undefined>
  const entriesSource = Array.isArray(record.entries) ? record.entries : []

  return {
    entries: entriesSource.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.participantId !== 'string' || typeof entry.nickname !== 'string') {
        return []
      }

      return [
        {
          correctCount: toNumber(entry.correctCount),
          emoji: typeof entry.emoji === 'string' ? entry.emoji : '🙂',
          lastPoints: toNumber(entry.lastPoints),
          nickname: entry.nickname,
          participantId: entry.participantId,
          previousRank: toNumber(entry.previousRank, toNumber(entry.rank)),
          rank: toNumber(entry.rank),
          realName: toNullableString(entry.realName),
          score: toNumber(entry.score),
        },
      ]
    }),
    totalPlayers: toNumber(record.totalPlayers),
  }
}

export function parseMyQuizStatus(value: Json | null | undefined): MyQuizStatus | null {
  const profile = parseParticipantProfile(value)

  if (!profile) {
    return null
  }

  const record = value as Record<string, Json | undefined>
  const answerSource = record.currentAnswer
  const currentAnswer =
    isRecord(answerSource) && typeof answerSource.questionId === 'string'
      ? {
          answered: answerSource.answered === true,
          correct: typeof answerSource.correct === 'boolean' ? answerSource.correct : null,
          correctOptionIdx: toNullableNumber(answerSource.correctOptionIdx),
          optionIdx: toNullableNumber(answerSource.optionIdx),
          points: toNullableNumber(answerSource.points),
          questionId: answerSource.questionId,
          revealed: answerSource.revealed === true,
        }
      : null

  return {
    ...profile,
    currentAnswer,
    rank: toNumber(record.rank),
    score: toNumber(record.score),
    totalPlayers: toNumber(record.totalPlayers),
  }
}

export async function joinSession(sessionId: string, nickname: string, emoji: string) {
  const { data, error } = await getSupabaseClient().rpc('join_session', {
    next_emoji: emoji,
    next_nickname: nickname.trim(),
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message === 'nickname is taken' ? 'That nickname is taken. Try another one.' : error.message)
  }

  const profile = parseParticipantProfile(data)

  if (!profile) {
    throw new Error('Unable to join this session.')
  }

  return profile
}

export async function getMyParticipant(sessionId: string) {
  const { data, error } = await getSupabaseClient().rpc('get_my_participant', {
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return parseParticipantProfile(data)
}

export async function setParticipantRealName(sessionId: string, realName: string) {
  const { data, error } = await getSupabaseClient().rpc('set_participant_real_name', {
    next_real_name: realName,
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return parseParticipantProfile(data)
}

export async function getQuizLeaderboard(sessionId: string, maxEntries = 10) {
  const { data, error } = await getSupabaseClient().rpc('get_quiz_leaderboard', {
    max_entries: maxEntries,
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return parseQuizLeaderboard(data)
}

export async function getMyQuizStatus(sessionId: string) {
  const { data, error } = await getSupabaseClient().rpc('get_my_quiz_status', {
    target_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return parseMyQuizStatus(data)
}

export function formatPoints(points: number) {
  return points.toLocaleString('en-US')
}

export function formatRank(rank: number) {
  const lastTwoDigits = rank % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${rank}th`
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`
    case 2:
      return `${rank}nd`
    case 3:
      return `${rank}rd`
    default:
      return `${rank}th`
  }
}
