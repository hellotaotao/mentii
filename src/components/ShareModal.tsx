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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <button
          aria-label="Close share dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-600">Share this room</p>
        <p className="mt-2 text-center text-sm text-slate-500">Scan the QR code or enter the code below to join.</p>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
            <QRCodeSVG aria-label="Session QR code" size={180} value={joinUrl} />
          </div>
        </div>

        <p className="mt-6 text-center text-3xl font-bold tracking-[0.4em] text-slate-900">{formatSessionCode(code)}</p>

        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
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
