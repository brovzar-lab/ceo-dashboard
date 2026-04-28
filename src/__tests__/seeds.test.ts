import { describe, expect, test } from 'vitest'
import { seeds } from '../data/seeds'

describe('seeds', () => {
  test('isDemo is true', () => {
    expect(seeds.isDemo).toBe(true)
  })

  test('has tasks in all three buckets', () => {
    const buckets = seeds.tasks.map((t) => t.bucket)
    expect(buckets).toContain('now')
    expect(buckets).toContain('next')
    expect(buckets).toContain('orbit')
  })

  test('has at least one required meeting', () => {
    const required = seeds.meetings.filter((m) => m.isRequired)
    expect(required.length).toBeGreaterThan(0)
  })

  test('has brief with jarvis and billy text', () => {
    expect(seeds.brief.jarvis.length).toBeGreaterThan(20)
    expect(seeds.brief.billy.length).toBeGreaterThan(20)
  })

  test('has inbox threads with tags', () => {
    expect(seeds.threads.length).toBeGreaterThanOrEqual(8)
    const tags = seeds.threads.map((t) => t.tag)
    expect(tags).toContain('DEAL')
  })

  test('has notion blocks', () => {
    expect(seeds.notionBlocks.length).toBeGreaterThanOrEqual(3)
  })

  test('has spark text', () => {
    expect(seeds.spark.length).toBeGreaterThan(10)
  })

  test('has decisions', () => {
    expect(seeds.decisions.length).toBeGreaterThanOrEqual(3)
  })
})
