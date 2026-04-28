import { render, screen, fireEvent } from '@testing-library/react'
import { DecisionJournal } from '../components/DecisionJournal'
import { useDecisionStore } from '../stores/useDecisionStore'
import { seeds } from '../data/seeds'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
  serverTimestamp: vi.fn(() => new Date()),
}))
vi.mock('@/lib/firestore', () => ({ db: {} }))

beforeEach(() => {
  useDecisionStore.setState({ decisions: seeds.decisions, searchQuery: '' })
})

test('DecisionJournal renders decisions list', () => {
  render(<DecisionJournal />)
  expect(screen.getByText(seeds.decisions[0].text)).toBeInTheDocument()
})

test('typing in search filters decisions', () => {
  render(<DecisionJournal />)
  const input = screen.getByPlaceholderText(/search/i)
  fireEvent.change(input, { target: { value: 'distribution' } })
  expect(useDecisionStore.getState().searchQuery).toBe('distribution')
})

test('export button is present', () => {
  render(<DecisionJournal />)
  expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
})
