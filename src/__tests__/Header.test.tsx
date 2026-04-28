import { render, screen } from '@testing-library/react'
import { Header } from '../components/Header'

test('Header renders wordmark', () => {
  render(<Header />)
  expect(screen.getByText(/Lemon Studios/i)).toBeInTheDocument()
})

test('Header has Sync All button', () => {
  render(<Header />)
  expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument()
})
