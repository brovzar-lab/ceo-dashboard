import { render, screen } from '@testing-library/react'
import { App } from '../App'

test('App renders Dashboard without crashing', () => {
  render(<App />)
  // AuthGate calls fetch — mock it to avoid errors
})
