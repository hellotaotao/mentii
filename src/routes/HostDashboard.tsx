import { CopyPlus, Loader2, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { MentiLogo } from '../components/MentiLogo'
import SlideRenderer from '../components/slides/SlideRenderer'
import SlideStage from '../components/slides/SlideStage'
import { Button, Field, TextInput } from '../components/ui/controls'
import { toPresentationTheme } from '../lib/presentationTheme'
import { formatSessionCode } from '../lib/sessionCode'
import {
  createRoomWithDefaultQuestion,
  deleteHostRoom,
  duplicateRoom,
  listHostRooms,
  listRoomSlides,
  type HostRoomSummary,
} from '../lib/supabaseQueries'
import type { EditorQuestion } from '../types/questions'
import type { HostAuthContext } from './HostAuthGate'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong while loading your rooms.'
}

function formatEditedAt(createdAt: string, formatter: Intl.DateTimeFormat) {
  const timestamp = Date.parse(createdAt)

  if (!Number.isFinite(timestamp)) {
    return 'Unknown date'
  }

  return formatter.format(new Date(timestamp))
}

function RoomMenu({
  isBusy,
  onDelete,
  onDuplicate,
  roomName,
}: {
  isBusy: boolean
  onDelete: () => void
  onDuplicate: () => void
  roomName: string
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label={`More actions for ${roomName}`}
        className="flex size-8 items-center justify-center rounded-full text-ink-3 transition hover:bg-sunken hover:text-ink"
        disabled={isBusy}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isBusy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </button>
      {isOpen ? (
        <div className="mentii-slide-down absolute right-0 top-9 z-20 w-44 rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_rgba(28,18,12,0.14)]">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-sunken"
            onClick={() => {
              setIsOpen(false)
              onDuplicate()
            }}
            type="button"
          >
            <CopyPlus className="size-4 text-ink-3" />
            Duplicate
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger transition hover:bg-danger-soft"
            onClick={() => {
              setIsOpen(false)
              onDelete()
            }}
            type="button"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}

function RoomCard({
  dateFormatter,
  firstSlide,
  isBusy,
  onDelete,
  onDuplicate,
  onOpen,
  room,
  slideCount,
}: {
  dateFormatter: Intl.DateTimeFormat
  firstSlide: EditorQuestion | null
  isBusy: boolean
  onDelete: () => void
  onDuplicate: () => void
  onOpen: () => void
  room: HostRoomSummary
  slideCount: number | null
}) {
  return (
    <li className="group">
      <button
        aria-label={`Open ${room.name}`}
        className="block w-full overflow-hidden rounded-2xl text-left ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(28,18,12,0.35)] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={onOpen}
        type="button"
      >
        {firstSlide ? (
          <SlideStage ariaHidden className="pointer-events-none aspect-video w-full" theme={toPresentationTheme(room.theme)}>
            <SlideRenderer preview question={firstSlide} results={null} />
          </SlideStage>
        ) : (
          <div className="aspect-video w-full bg-sunken" />
        )}
      </button>

      <div className="mt-3 flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{room.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
            {room.state === 'live' ? (
              <span className="flex items-center gap-1 font-semibold text-live">
                <span className="size-1.5 rounded-full bg-live" />
                Live
              </span>
            ) : null}
            <span>{slideCount === null ? '' : `${slideCount} ${slideCount === 1 ? 'slide' : 'slides'}`}</span>
            <span>{`Code ${formatSessionCode(room.code)}`}</span>
            <span>{formatEditedAt(room.created_at, dateFormatter)}</span>
          </p>
        </div>
        <RoomMenu isBusy={isBusy} onDelete={onDelete} onDuplicate={onDuplicate} roomName={room.name} />
      </div>
    </li>
  )
}

export default function HostDashboard() {
  const navigate = useNavigate()
  const hostContext = useOutletContext<HostAuthContext | undefined>()
  const hostUserId = hostContext?.user.id ?? null
  const hostEmail = hostContext?.user.email ?? null
  const [rooms, setRooms] = useState<HostRoomSummary[]>([])
  const [slidesByRoom, setSlidesByRoom] = useState<Map<string, EditorQuestion[]> | null>(null)
  const [createRoomName, setCreateRoomName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }), [])

  useEffect(() => {
    let isActive = true

    async function loadRooms() {
      if (!hostUserId) {
        if (isActive) {
          setStatus('error')
          setErrorMessage('Sign in as a host to see your rooms.')
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

        // Thumbnails are a nice-to-have; the list stays usable if they fail to load.
        const nextSlidesByRoom = await listRoomSlides(hostRooms.map((room) => room.id)).catch(() => null)

        if (isActive && nextSlidesByRoom) {
          setSlidesByRoom(nextSlidesByRoom)
        }
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
    if (!isCreating) {
      setIsCreateDialogOpen(false)
    }
  }

  async function handleCreateRoom() {
    if (!hostUserId || isCreating) {
      return
    }

    const normalizedRoomName = createRoomName.trim()

    if (!normalizedRoomName) {
      setErrorMessage('Give the room a name.')
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

  async function handleDuplicateRoom(room: HostRoomSummary) {
    if (busyRoomId) {
      return
    }

    const nextRoomName = window.prompt('Name for the copy', `${room.name} (copy)`)

    if (nextRoomName === null) {
      return
    }

    setErrorMessage(null)
    setBusyRoomId(room.id)

    try {
      const { roomId } = await duplicateRoom(room.id, nextRoomName)
      navigate(`/host/${roomId}`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setBusyRoomId(null)
    }
  }

  async function handleDeleteRoom(room: HostRoomSummary) {
    if (!hostUserId || busyRoomId) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete "${room.name}"? Its slides and every response are removed permanently.`,
    )

    if (!shouldDelete) {
      return
    }

    setErrorMessage(null)
    setBusyRoomId(room.id)

    try {
      await deleteHostRoom(room.id, hostUserId)
      setRooms((currentRooms) => currentRooms.filter((currentRoom) => currentRoom.id !== room.id))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyRoomId(null)
    }
  }

  return (
    <main className="min-h-screen bg-app text-ink">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
        <MentiLogo creator size="sm" />
        {hostEmail ? <span className="text-[13px] text-ink-3">{hostEmail}</span> : null}
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Your rooms</h1>
            <p className="mt-1 text-sm text-ink-3">
              {status === 'ready' ? `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}` : ' '}
            </p>
          </div>
          <Button disabled={isCreating || status !== 'ready'} onClick={openCreateRoomDialog} variant="primary">
            <Plus className="size-4" />
            New room
          </Button>
        </div>

        {errorMessage && !isCreateDialogOpen ? (
          <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {status === 'loading' ? (
          <ul aria-label="Loading rooms" className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <li key={index}>
                <div className="aspect-video animate-pulse rounded-2xl bg-line/60" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-line/60" />
              </li>
            ))}
          </ul>
        ) : status === 'ready' && rooms.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">Create your first room</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-3">
              A room holds your slides and gets its own join code for the audience.
            </p>
            <Button className="mt-6" onClick={openCreateRoomDialog} variant="primary">
              <Plus className="size-4" />
              New room
            </Button>
          </div>
        ) : status === 'ready' ? (
          <ul className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const roomSlides = slidesByRoom?.get(room.id) ?? null

              return (
                <RoomCard
                  dateFormatter={dateFormatter}
                  firstSlide={roomSlides?.[0] ?? null}
                  isBusy={busyRoomId === room.id}
                  key={room.id}
                  onDelete={() => {
                    void handleDeleteRoom(room)
                  }}
                  onDuplicate={() => {
                    void handleDuplicateRoom(room)
                  }}
                  onOpen={() => navigate(`/host/${room.id}`)}
                  room={room}
                  slideCount={roomSlides ? roomSlides.length : null}
                />
              )
            })}
          </ul>
        ) : null}
      </section>

      {isCreateDialogOpen ? (
        <div
          aria-labelledby="create-room-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateRoomDialog()
            }
          }}
          role="dialog"
        >
          <form
            className="mentii-pop-in w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault()
              void handleCreateRoom()
            }}
          >
            <h2 className="text-lg font-semibold" id="create-room-title">
              New room
            </h2>
            <p className="mt-1 text-sm text-ink-3">You can rename it any time from the editor.</p>

            <div className="mt-5">
              <Field htmlFor="create-room-name" label="Room name">
                <TextInput
                  autoFocus
                  id="create-room-name"
                  maxLength={120}
                  onChange={(event) => setCreateRoomName(event.target.value)}
                  placeholder="October all-hands"
                  value={createRoomName}
                />
              </Field>
            </div>

            {errorMessage ? <p className="mt-3 text-sm text-danger">{errorMessage}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button disabled={isCreating} onClick={closeCreateRoomDialog} variant="ghost">
                Cancel
              </Button>
              <Button disabled={isCreating} type="submit" variant="primary">
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
                {isCreating ? 'Creating…' : 'Create room'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  )
}
