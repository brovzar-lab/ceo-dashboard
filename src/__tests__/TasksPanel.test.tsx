import { render, screen } from '@testing-library/react'
import { TasksPanel } from '../components/TasksPanel'
import { useTaskStore } from '../stores/useTaskStore'
import { seeds } from '../data/seeds'

beforeEach(() => {
  useTaskStore.setState({ tasks: seeds.tasks })
})

test('TasksPanel renders three columns', () => {
  render(<TasksPanel />)
  expect(screen.getByText('NOW')).toBeInTheDocument()
  expect(screen.getByText('NEXT')).toBeInTheDocument()
  expect(screen.getByText('ORBIT')).toBeInTheDocument()
})

test('NOW column shows now-bucket tasks', () => {
  render(<TasksPanel />)
  const nowTasks = seeds.tasks.filter(t => t.bucket === 'now' && !t.done)
  expect(screen.getAllByTestId('task-item').length).toBeGreaterThanOrEqual(nowTasks.length)
})
