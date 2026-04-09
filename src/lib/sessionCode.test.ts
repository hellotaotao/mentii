import { describe, expect, it } from 'vitest'
import { formatSessionCode, normalizeSessionCode } from './sessionCode'

describe('sessionCode helpers', () => {
  it('formats six-digit session codes with a center space', () => {
    expect(formatSessionCode('482176')).toBe('4821 76')
  })

  it('normalizes pasted session codes by removing whitespace', () => {
    expect(normalizeSessionCode(' 4821 76 ')).toBe('482176')
  })
})
