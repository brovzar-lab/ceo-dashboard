import { render, screen, fireEvent } from '@testing-library/react'
import { TriageMode } from '../components/TriageMode'
import { useInboxStore } from '../stores/useInboxStore'
import { seeds } from '../data/seeds'

beforeEach(() => {
  useInboxStore.setState({ threads: seeds.threads, triageMode: true, activeThread: seeds.threads[0].id, loading: false })
})

test('TriageMode shows active thread subject', () => {
  render(<TriageMode />)
  expect(screen.getByText(seeds.threads[0].subject)).toBeInTheDocument()
})

test('ESC exits triage mode', () => {
  render(<TriageMode />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(useInboxStore.getState().triageMode).toBe(false)
})

test('J key advances to next thread', () => {
  render(<TriageMode />)
  fireEvent.keyDown(document, { key: 'j' })
  expect(useInboxStore.getState().activeThread).toBe(seeds.threads[1].id)
})

test('K key goes to prev thread', () => {
  useInboxStore.setState({ ...useInboxStore.getState(), activeThread: seeds.threads[1].id })
  render(<TriageMode />)
  fireEvent.keyDown(document, { key: 'k' })
  expect(useInboxStore.getState().activeThread).toBe(seeds.threads[0].id)
})

test('? key shows keyboard help overlay', () => {
  render(<TriageMode />)
  fireEvent.keyDown(document, { key: '?' })
  expect(screen.getByTestId('keyboard-help')).toBeInTheDocument()
})
