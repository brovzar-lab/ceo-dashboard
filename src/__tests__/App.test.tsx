import { render, screen } from '@testing-library/react'
import { App } from '../App'

test('App renders CEO Dashboard title', () => {
  render(<App />)
  expect(screen.getByText(/CEO Dashboard/i)).toBeInTheDocument()
})
