import { describe, expect, it } from 'vitest'
import { buildJoinUrl, formatSessionCode, generateSessionCode, normalizeSessionCode } from './sessionCode'

describe('sessionCode helpers', () => {
  it('formats six-digit session codes with a center space', () => {
    expect(formatSessionCode('482176')).toBe('4821 76')
  })

  it('normalizes pasted session codes by removing whitespace', () => {
    expect(normalizeSessionCode(' 4821 76 ')).toBe('482176')
  })

  it('builds the audience join URL from a session code', () => {
    expect(buildJoinUrl('482176', 'https://mentii.app')).toBe('https://mentii.app/?code=482176')
  })

  it('generates zero-padded six-digit codes', () => {
    expect(generateSessionCode(() => 0)).toBe('000000')
    expect(generateSessionCode(() => 0.999999)).toBe('999999')
  })
})
