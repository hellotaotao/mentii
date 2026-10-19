import { Copy, X } from 'lucide-react'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { buildJoinUrl, formatSessionCode } from '../lib/sessionCode'

type ShareModalProps = {
  code: string
  onClose: () => void
  onError: (message: string) => void
}

export default function ShareModal({ code, onClose, onError }: ShareModalProps) {
  const [shareState, setShareState] = useState<'copied' | 'idle'>('idle')
  const joinUrl = buildJoinUrl(code)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setShareState('copied')
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message : 'Unable to copy the join link.')
    }
  }

  return (
    <div
      aria-labelledby="share-room-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="mentii-pop-in relative w-full max-w-sm rounded-2xl bg-surface p-7 text-center shadow-2xl">
        <button
          aria-label="Close share dialog"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-ink-3 transition hover:bg-sunken hover:text-ink"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-lg font-semibold text-ink" id="share-room-title">
          Invite the audience
        </h2>
        <p className="mt-1 text-sm text-ink-3">Scan the QR code, or go to {window.location.host} and enter the code.</p>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
            <QRCodeSVG aria-label="Session QR code" size={180} value={joinUrl} />
          </div>
        </div>

        <p className="mt-5 text-[32px] font-bold tabular-nums tracking-[0.08em] text-ink">{formatSessionCode(code)}</p>

        <button
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={() => {
            void handleCopy()
          }}
          type="button"
        >
          <Copy className="size-4" />
          {shareState === 'copied' ? 'Link copied!' : 'Copy join link'}
        </button>
      </div>
    </div>
  )
}
