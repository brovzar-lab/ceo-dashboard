import { render, screen } from '@testing-library/react'
import { BrainPanel } from '../components/BrainPanel'
import { useBrainStore } from '../stores/useBrainStore'
import { seeds } from '../data/seeds'

beforeEach(() => {
  useBrainStore.setState({ blocks: seeds.notionBlocks, loading: false, cached: false })
})

test('BrainPanel renders notion blocks', () => {
  render(<BrainPanel />)
  const firstBlock = seeds.notionBlocks.find(b => b.text.length > 0)
  expect(screen.getByText(firstBlock!.text)).toBeInTheDocument()
})

test('BrainPanel renders tone dots', () => {
  render(<BrainPanel />)
  expect(screen.getAllByTestId('tone-dot').length).toBeGreaterThan(0)
})
