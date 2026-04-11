import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  createRoomWithDefaultQuestion,
  deleteHostRoom,
  listHostRooms,
  type HostRoomSummary,
} from '../lib/supabaseQueries'
import { formatSessionCode } from '../lib/sessionCode'
import type { HostAuthContext } from './HostAuthGate'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong while loading your rooms.'
}

function formatCreatedAt(createdAt: string, formatter: Intl.DateTimeFormat) {
  const timestamp = Date.parse(createdAt)

  if (!Number.isFinite(timestamp)) {
    return 'Unknown date'
  }

  return formatter.format(new Date(timestamp))
}

export default function HostDashboard() {
  const navigate = useNavigate()
  const hostContext = useOutletContext<HostAuthContext | undefined>()
  const hostUserId = hostContext?.user.id ?? null
  const [rooms, setRooms] = useState<HostRoomSummary[]>([])
  const [createRoomName, setCreateRoomName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  )

  useEffect(() => {
    let isActive = true

    async function loadRooms() {
      if (!hostUserId) {
        if (isActive) {
          setStatus('error')
          setErrorMessage('Host authentication is required to load your rooms.')
        }
        return
      }

      setStatus('loading')
      setErrorMessage(null)

      try {
        const hostRooms = await listHostRooms(hostUserId)

        if (!isActive) {
          return
        }

        setRooms(hostRooms)
        setStatus('ready')
      } catch (error) {
        if (!isActive) {
          return
        }

        setStatus('error')
        setErrorMessage(getErrorMessage(error))
      }
    }

    void loadRooms()

    return () => {
      isActive = false
    }
  }, [hostUserId])

  function openCreateRoomDialog() {
    setCreateRoomName(`Room ${rooms.length + 1}`)
    setErrorMessage(null)
    setIsCreateDialogOpen(true)
  }

  function closeCreateRoomDialog() {
    if (isCreating) {
      return
    }

    setIsCreateDialogOpen(false)
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hostUserId || isCreating) {
      return
    }

    const normalizedRoomName = createRoomName.trim()

    if (!normalizedRoomName) {
      setErrorMessage('Room name is required.')
      return
    }

    setErrorMessage(null)
    setIsCreating(true)

    try {
      const { roomId } = await createRoomWithDefaultQuestion(hostUserId, normalizedRoomName)
      setIsCreateDialogOpen(false)
      navigate(`/host/${roomId}`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteRoom(room: HostRoomSummary) {
    if (!hostUserId || deletingRoomId) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete room "${room.name}" (${formatSessionCode(room.code)})? This also removes every slide and response for that room.`,
    )

    if (!shouldDelete) {
      return
    }

    setErrorMessage(null)
    setDeletingRoomId(room.id)

    try {
      await deleteHostRoom(room.id, hostUserId)
      setRooms((currentRooms) =>
        currentRooms.filter((currentRoom) => currentRoom.id !== room.id),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setDeletingRoomId(null)
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Loading your rooms…</h1>
          <p className="mt-4 text-sm text-slate-300">Fetching the rooms you created so you can resume instantly.</p>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-rose-300/30 bg-rose-400/10 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-200">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Unable to load dashboard</h1>
          <p className="mt-4 text-sm text-rose-100">{errorMessage ?? 'Try refreshing this page.'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Host</p>
            <h1 className="mt-2 text-3xl font-semibold">My rooms</h1>
            <p className="mt-2 text-sm text-slate-300">
              Resume an existing room or create a new room when you are ready to build your next poll.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            onClick={() => {
              openCreateRoomDialog()
            }}
            type="button"
          >
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isCreating ? 'Creating room…' : 'Create new room'}
          </button>
        </header>

        {isCreateDialogOpen ? (
          <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">New room</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Name your room</h2>
              <p className="mt-2 text-sm text-slate-300">This name can be changed later inside the room editor.</p>

              <form className="mt-5 space-y-4" onSubmit={(event) => {
                void handleCreateRoom(event)
              }}>
                <label className="block space-y-2" htmlFor="create-room-name">
                  <span className="text-sm font-medium text-slate-200">Room name</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                    id="create-room-name"
                    onChange={(event) => setCreateRoomName(event.target.value)}
                    placeholder="Quarterly planning"
                    value={createRoomName}
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isCreating}
                    onClick={closeCreateRoomDialog}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isCreating}
                    type="submit"
                  >
                    {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {isCreating ? 'Creating…' : 'Create room'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {rooms.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/20 bg-slate-950/60 p-10 text-center">
            <h2 className="text-2xl font-semibold text-white">No rooms yet</h2>
            <p className="mt-3 text-sm text-slate-300">Create your first room to start building slides and collecting votes.</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <ul className="divide-y divide-white/10">
              {rooms.map((room) => {
                const isDeleting = deletingRoomId === room.id

                return (
                  <li className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between" key={room.id}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Room</p>
                      <p className="mt-2 text-xl font-semibold text-white">{room.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{`Room ID ${room.id}`}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                        <span>{`Code ${formatSessionCode(room.code)}`}</span>
                        <span>{`Created ${formatCreatedAt(room.created_at, dateFormatter)}`}</span>
                        <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                          {room.state}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                        onClick={() => navigate(`/host/${room.id}`)}
                        type="button"
                      >
                        <ExternalLink className="size-4" />
                        Open room
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-300/40 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isDeleting}
                        onClick={() => {
                          void handleDeleteRoom(room)
                        }}
                        type="button"
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </section>
    </main>
  )
}
