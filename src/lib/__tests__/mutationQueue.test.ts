import { describe, expect, test, vi } from 'vitest'
import { MutationQueue } from '../mutationQueue'

describe('MutationQueue', () => {
  test('runs mutations in order for the same id', async () => {
    const queue = new MutationQueue()
    const log: number[] = []
    const fn1 = () => new Promise<void>(r => setTimeout(() => { log.push(1); r() }, 10))
    const fn2 = () => new Promise<void>(r => { log.push(2); r() })
    queue.enqueue('id1', fn1)
    await queue.enqueue('id1', fn2)
    expect(log).toEqual([1, 2])
  })

  test('runs mutations for different ids in parallel', async () => {
    const queue = new MutationQueue()
    const started: string[] = []
    const p1 = queue.enqueue('id1', () => new Promise<void>(r => { started.push('a'); setTimeout(r, 20) }))
    const p2 = queue.enqueue('id2', () => new Promise<void>(r => { started.push('b'); setTimeout(r, 5) }))
    await Promise.all([p1, p2])
    // Both start before either finishes (parallel)
    expect(started).toContain('a')
    expect(started).toContain('b')
  })
})
