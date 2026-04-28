import { describe, expect, test, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-dec-id' }),
  serverTimestamp: vi.fn(() => new Date()),
}))
vi.mock('@/lib/firestore', () => ({ db: {} }))

import { useDecisionStore } from '../stores/useDecisionStore'
import { seeds } from '../data/seeds'

describe('useDecisionStore', () => {
  beforeEach(() => {
    useDecisionStore.setState({ decisions: seeds.decisions, searchQuery: '' })
  })

  test('initial state has seed decisions', () => {
    expect(useDecisionStore.getState().decisions.length).toBeGreaterThan(0)
  })

  test('add inserts optimistic decision at start of list', () => {
    const before = useDecisionStore.getState().decisions.length
    act(() => {
      useDecisionStore.getState().add('uid1', 'Going with plan B.')
    })
    const { decisions } = useDecisionStore.getState()
    expect(decisions.length).toBe(before + 1)
    expect(decisions[0].text).toBe('Going with plan B.')
  })

  test('search filters decisions by text', () => {
    act(() => {
      useDecisionStore.getState().setSearch('distribution')
    })
    const filtered = useDecisionStore.getState().filteredDecisions
    expect(filtered.every(d => d.text.toLowerCase().includes('distribution'))).toBe(true)
  })

  test('exportMd returns markdown with all decisions', () => {
    const md = useDecisionStore.getState().exportMd()
    expect(md).toContain('# Decision Journal')
    expect(md.length).toBeGreaterThan(50)
  })
})
