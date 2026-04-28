import { describe, expect, test } from 'vitest'
import { tagThread, prioritizeThread, DEFAULT_TAG_PATTERNS } from './threadTags'

const now = new Date().toISOString()
const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000 - 1).toISOString()

describe('tagThread', () => {
  test('DEAL: domain match', () => {
    expect(tagThread({ from: 'someone@creel.mx', fromDomain: 'creel.mx', subject: 'Hello', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('DEAL')
  })
  test('DEAL: sender name match (case-insensitive)', () => {
    expect(tagThread({ from: 'Mirna Alvarado', fromDomain: 'unknown.com', subject: 'Re:', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('DEAL')
  })
  test('INT: lemonfilms.com domain', () => {
    expect(tagThread({ from: 'ana@lemonfilms.com', fromDomain: 'lemonfilms.com', subject: 'Team update', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('INT')
  })
  test('INFO: theblacklist.com domain', () => {
    expect(tagThread({ from: 'news@theblacklist.com', fromDomain: 'theblacklist.com', subject: 'Digest', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('INFO')
  })
  test('INFO: subject contains "receipt"', () => {
    expect(tagThread({ from: 'noreply@stripe.com', fromDomain: 'stripe.com', subject: 'Your receipt', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('INFO')
  })
  test('INDUSTRY: canacine.org.mx domain', () => {
    expect(tagThread({ from: 'info@canacine.org.mx', fromDomain: 'canacine.org.mx', subject: 'Convocatoria', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('INDUSTRY')
  })
  test('NONE: unknown', () => {
    expect(tagThread({ from: 'random@example.com', fromDomain: 'example.com', subject: 'Hello', labels: [] }, DEFAULT_TAG_PATTERNS)).toBe('NONE')
  })
})

describe('prioritizeThread', () => {
  test('HOT: DEAL + unread + within 12h', () => {
    expect(prioritizeThread({ tag: 'DEAL', unread: true, receivedAt: now, subject: 'Re: deal' })).toBe('HOT')
  })
  test('HOT: DEAL + unread + subject contains URGENT', () => {
    expect(prioritizeThread({ tag: 'DEAL', unread: false, receivedAt: twelveHoursAgo, subject: 'URGENT: need response' })).toBe('HOT')
  })
  test('HOT: any tag + subject contains "today"', () => {
    expect(prioritizeThread({ tag: 'INT', unread: false, receivedAt: twelveHoursAgo, subject: 'Please review today' })).toBe('HOT')
  })
  test('MED: DEAL without HOT criteria', () => {
    expect(prioritizeThread({ tag: 'DEAL', unread: false, receivedAt: twelveHoursAgo, subject: 'FYI update' })).toBe('MED')
  })
  test('MED: INT with action verb', () => {
    expect(prioritizeThread({ tag: 'INT', unread: false, receivedAt: twelveHoursAgo, subject: 'Please review the contract' })).toBe('MED')
  })
  test('LOW: INFO default', () => {
    expect(prioritizeThread({ tag: 'INFO', unread: false, receivedAt: twelveHoursAgo, subject: 'Newsletter digest' })).toBe('LOW')
  })
  test('LOW: INDUSTRY default', () => {
    expect(prioritizeThread({ tag: 'INDUSTRY', unread: false, receivedAt: twelveHoursAgo, subject: 'Announcement' })).toBe('LOW')
  })
  test('LOW: thread untouched >7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    expect(prioritizeThread({ tag: 'DEAL', unread: false, receivedAt: eightDaysAgo, subject: 'Old thread' })).toBe('LOW')
  })
})
