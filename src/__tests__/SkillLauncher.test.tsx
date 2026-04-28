import { render, screen, fireEvent } from '@testing-library/react'
import { SkillLauncher } from '../components/SkillLauncher'
import { useUIStore } from '../stores/useUIStore'

beforeEach(() => {
  useUIStore.setState({ skillLauncherOpen: false, activeModal: null, drawerOpen: false, activeContext: { kind: null, id: null } })
})

test('renders FAB button', () => {
  render(<SkillLauncher />)
  expect(screen.getByTestId('skill-launcher-fab')).toBeInTheDocument()
})

test('clicking FAB opens skill grid', () => {
  render(<SkillLauncher />)
  fireEvent.click(screen.getByTestId('skill-launcher-fab'))
  expect(useUIStore.getState().skillLauncherOpen).toBe(true)
  expect(screen.getByPlaceholderText(/search skills/i)).toBeInTheDocument()
})

test('shows all 27 skills when open and search is empty', () => {
  useUIStore.setState({ ...useUIStore.getState(), skillLauncherOpen: true })
  render(<SkillLauncher />)
  expect(screen.getAllByTestId('skill-item').length).toBe(27)
})

test('search filters skills by title', () => {
  useUIStore.setState({ ...useUIStore.getState(), skillLauncherOpen: true })
  render(<SkillLauncher />)
  fireEvent.change(screen.getByPlaceholderText(/search skills/i), { target: { value: 'pitch' } })
  expect(screen.getAllByTestId('skill-item').length).toBeLessThan(27)
})
