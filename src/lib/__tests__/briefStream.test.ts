import { describe, expect, test, vi } from 'vitest'
import { parseSseEvent } from '../briefStream'

describe('parseSseEvent', () => {
  test('parses cached event', () => {
    const line = `data: ${JSON.stringify({ type: 'cached', jarvis: 'j', billy: 'b', isStale: true })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'cached', jarvis: 'j', billy: 'b', isStale: true })
  })

  test('parses token event', () => {
    const line = `data: ${JSON.stringify({ type: 'token', voice: 'jarvis', text: 'Good morning' })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'token', voice: 'jarvis', text: 'Good morning' })
  })

  test('parses done event', () => {
    const line = `data: ${JSON.stringify({ type: 'done', jarvis: 'j', billy: 'b', generatedAt: '2026-04-28T00:00:00Z', briefId: 'abc-2026-04-28' })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'done', briefId: 'abc-2026-04-28' })
  })

  test('returns null for non-data lines', () => {
    expect(parseSseEvent('')).toBeNull()
    expect(parseSseEvent(': heartbeat')).toBeNull()
  })

  test('returns null for malformed JSON', () => {
    expect(parseSseEvent('data: {not-json}')).toBeNull()
  })
})
