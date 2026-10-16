import { describe, expect, it } from 'vitest'
import {
  formatRank,
  parseMyQuizStatus,
  parseParticipantProfile,
  parseQuizLeaderboard,
  roomUsesQuizGame,
  suggestParticipantProfile,
} from './quizGame'
import type { EditorQuestion } from '../types/questions'

describe('quizGame helpers', () => {
  it('suggests a nickname that matches the avatar animal', () => {
    expect(suggestParticipantProfile(() => 0)).toEqual({ emoji: '🦊', nickname: 'Brave Fox' })
  })

  it('formats ordinal ranks', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(formatRank)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
    ])
  })

  it('only treats rooms with quiz or leaderboard slides as games', () => {
    const asQuestions = (types: string[]) => types.map((type) => ({ type }) as EditorQuestion)

    expect(roomUsesQuizGame(asQuestions(['multiple_choice', 'word_cloud']))).toBe(false)
    expect(roomUsesQuizGame(asQuestions(['multiple_choice', 'quiz']))).toBe(true)
    expect(roomUsesQuizGame(asQuestions(['leaderboard']))).toBe(true)
  })

  it('parses participant profiles and rejects empty payloads', () => {
    expect(parseParticipantProfile(null)).toBeNull()
    expect(parseParticipantProfile({ emoji: '🐼', nickname: 'Panda', realName: '' })).toEqual({
      emoji: '🐼',
      nickname: 'Panda',
      realName: null,
    })
  })

  it('parses leaderboard rows and skips malformed entries', () => {
    expect(
      parseQuizLeaderboard({
        entries: [
          { emoji: '🦊', nickname: 'Fox', participantId: 'p1', rank: 1, score: 900 },
          { nickname: 'missing id' },
        ],
        totalPlayers: 4,
      }),
    ).toEqual({
      entries: [
        {
          correctCount: 0,
          emoji: '🦊',
          lastPoints: 0,
          nickname: 'Fox',
          participantId: 'p1',
          previousRank: 1,
          rank: 1,
          realName: null,
          score: 900,
        },
      ],
      totalPlayers: 4,
    })
  })

  it('keeps unrevealed answers free of correctness data', () => {
    const status = parseMyQuizStatus({
      currentAnswer: { answered: true, correct: null, optionIdx: 2, points: null, questionId: 'q1', revealed: false },
      emoji: '🦊',
      nickname: 'Fox',
      rank: 3,
      score: 1200,
      totalPlayers: 9,
    })

    expect(status?.currentAnswer).toEqual({
      answered: true,
      correct: null,
      correctOptionIdx: null,
      optionIdx: 2,
      points: null,
      questionId: 'q1',
      revealed: false,
    })
    expect(status?.rank).toBe(3)
  })
})
