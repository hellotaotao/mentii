const PARTICIPANT_STORAGE_KEY = 'mentii.participant-id'

export function getParticipantId() {
  const existing = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY)
  if (existing) return existing

  const nextId = crypto.randomUUID()
  window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, nextId)
  return nextId
}
