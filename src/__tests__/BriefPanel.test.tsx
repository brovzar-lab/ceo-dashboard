import { render, screen } from '@testing-library/react'
import { BriefPanel } from '../components/BriefPanel'
import { useBriefStore } from '../stores/useBriefStore'
import { seeds } from '../data/seeds'

beforeEach(() => {
  useBriefStore.setState({ jarvis: seeds.brief.jarvis, billy: seeds.brief.billy, isStale: false, isStreaming: false, generatedAt: null, briefId: null })
})

test('BriefPanel renders jarvis section', () => {
  render(<BriefPanel />)
  expect(screen.getByTestId('brief-jarvis')).toBeInTheDocument()
})

test('BriefPanel renders billy section', () => {
  render(<BriefPanel />)
  expect(screen.getByTestId('brief-billy')).toBeInTheDocument()
})

test('BriefPanel shows stale indicator when isStale=true', () => {
  useBriefStore.setState({ ...useBriefStore.getState(), isStale: true })
  render(<BriefPanel />)
  expect(screen.getByTestId('brief-stale-badge')).toBeInTheDocument()
})
