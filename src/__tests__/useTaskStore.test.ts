import { describe, expect, test, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn(() => ({ path: 'tasks/new-id' })),
  serverTimestamp: vi.fn(() => new Date()),
}))

vi.mock('@/lib/firestore', () => ({ db: {} }))

import { useTaskStore } from '../stores/useTaskStore'
import { seeds } from '../data/seeds'

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: seeds.tasks })
  })

  test('initial state has seed tasks', () => {
    const { tasks } = useTaskStore.getState()
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].bucket).toBeDefined()
  })

  test('create adds an optimistic task immediately', () => {
    const before = useTaskStore.getState().tasks.length
    act(() => {
      useTaskStore.getState().create('uid1', { title: 'New task', bucket: 'now', source: 'manual' })
    })
    expect(useTaskStore.getState().tasks.length).toBe(before + 1)
    const newTask = useTaskStore.getState().tasks.find(t => t.title === 'New task')
    expect(newTask).toBeDefined()
    expect(newTask?.bucket).toBe('now')
  })

  test('moveBucket changes the task bucket', () => {
    const taskId = seeds.tasks[0].id
    act(() => {
      useTaskStore.getState().moveBucket('uid1', taskId, 'orbit')
    })
    const updated = useTaskStore.getState().tasks.find(t => t.id === taskId)
    expect(updated?.bucket).toBe('orbit')
  })

  test('toggleDone marks task done', () => {
    const taskId = seeds.tasks[0].id
    act(() => {
      useTaskStore.getState().toggleDone('uid1', taskId)
    })
    const updated = useTaskStore.getState().tasks.find(t => t.id === taskId)
    expect(updated?.done).toBe(true)
  })

  test('remove deletes task from state immediately', () => {
    const taskId = seeds.tasks[0].id
    const before = useTaskStore.getState().tasks.length
    act(() => {
      useTaskStore.getState().remove('uid1', taskId)
    })
    expect(useTaskStore.getState().tasks.length).toBe(before - 1)
  })
})
