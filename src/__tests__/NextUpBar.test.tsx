import { render, screen, fireEvent } from '@testing-library/react'
import { NextUpBar } from '../components/NextUpBar'
import { useCalendarStore } from '../stores/useCalendarStore'
import { useUIStore } from '../stores/useUIStore'
import { seeds } from '../data/seeds'

beforeEach(() => {
  useCalendarStore.setState({ events: seeds.meetings, loading: false })
  useUIStore.setState({ activeModal: null, drawerOpen: false, skillLauncherOpen: false, activeContext: { kind: null, id: null } })
})

test('NextUpBar renders required meetings', () => {
  render(<NextUpBar />)
  const required = seeds.meetings.filter(m => m.isRequired)
  expect(screen.getAllByTestId('meeting-pill').length).toBe(required.length)
})

test('clicking a meeting pill opens MeetingPrepModal', () => {
  render(<NextUpBar />)
  fireEvent.click(screen.getAllByTestId('meeting-pill')[0])
  expect(useUIStore.getState().activeModal).toBe('meeting-prep')
})
