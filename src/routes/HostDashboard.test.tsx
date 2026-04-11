import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import HostDashboard from './HostDashboard'

const {
  mockCreateRoomWithDefaultQuestion,
  mockDeleteHostRoom,
  mockListHostRooms,
} = vi.hoisted(() => ({
  mockCreateRoomWithDefaultQuestion: vi.fn(),
  mockDeleteHostRoom: vi.fn(),
  mockListHostRooms: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  createRoomWithDefaultQuestion: mockCreateRoomWithDefaultQuestion,
  deleteHostRoom: mockDeleteHostRoom,
  listHostRooms: mockListHostRooms,
}))

const hostUser = {
  email: 'host@example.com',
  id: 'host-1',
}

const rooms = [
  {
    code: '482176',
    created_at: '2026-04-09T08:30:00.000Z',
    id: 'session-1',
    name: 'Weekly standup',
    state: 'draft',
  },
  {
    code: '185004',
    created_at: '2026-04-08T06:00:00.000Z',
    id: 'session-2',
    name: 'Launch retro',
    state: 'ended',
  },
]

function renderDashboard(initialPath = '/host') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Outlet context={{ user: hostUser }} />}>
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/host/:sessionId" element={<p data-testid="host-console-route">Host console route</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockCreateRoomWithDefaultQuestion.mockReset()
  mockDeleteHostRoom.mockReset()
  mockListHostRooms.mockReset()

  mockListHostRooms.mockResolvedValue(rooms)
  mockCreateRoomWithDefaultQuestion.mockResolvedValue({
    roomId: 'session-new',
  })
  mockDeleteHostRoom.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe('HostDashboard', () => {
  it('loads and renders host rooms', async () => {
    renderDashboard()

    await waitFor(() => expect(mockListHostRooms).toHaveBeenCalledWith('host-1'))
    expect(await screen.findByText('Weekly standup')).toBeInTheDocument()
    expect(screen.getByText('Launch retro')).toBeInTheDocument()
    expect(await screen.findByText(/code 4821 76/i)).toBeInTheDocument()
    expect(screen.getByText(/code 1850 04/i)).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('ended')).toBeInTheDocument()
  })

  it('asks for room name before creating a new room', async () => {
    renderDashboard()

    await screen.findByText('Weekly standup')
    expect(mockCreateRoomWithDefaultQuestion).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /create new room/i }))
    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: 'Quarterly planning' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create room$/i }))

    await waitFor(() =>
      expect(mockCreateRoomWithDefaultQuestion).toHaveBeenCalledWith('host-1', 'Quarterly planning'),
    )
    expect(await screen.findByTestId('host-console-route')).toBeInTheDocument()
  })

  it('deletes a room after confirmation', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderDashboard()

    await screen.findByText(/code 4821 76/i)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => expect(mockDeleteHostRoom).toHaveBeenCalledWith('session-1', 'host-1'))
    expect(screen.queryByText(/code 4821 76/i)).not.toBeInTheDocument()

    confirmMock.mockRestore()
  })
})
