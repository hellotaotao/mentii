import { QRCodeSVG } from 'qrcode.react'
import { buildJoinUrl, formatSessionCode } from '../lib/sessionCode'

type SessionCodeBarProps = {
  code: string
}

export default function SessionCodeBar({ code }: SessionCodeBarProps) {
  const joinUrl = buildJoinUrl(code)

  return (
    <header className="flex items-center justify-between gap-6 border-b border-white/10 bg-slate-950/95 px-6 py-4 sm:px-8">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Join</p>
        <p className="mt-2 text-lg font-medium text-white sm:text-2xl">Go to www.menti.com</p>
      </div>

      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Code</p>
          <p className="mt-2 text-2xl font-semibold tracking-[0.4em] text-white sm:text-3xl">
            {formatSessionCode(code)}
          </p>
        </div>

        <div className="hidden rounded-2xl bg-white p-2 sm:block">
          <QRCodeSVG aria-label="Session QR code" size={72} value={joinUrl} />
        </div>
      </div>
    </header>
  )
}
