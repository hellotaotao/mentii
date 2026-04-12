import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { buildJoinUrl, formatSessionCode } from '../lib/sessionCode'

type SessionCodeBarProps = {
  code: string
}

export default function SessionCodeBar({ code }: SessionCodeBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const joinUrl = buildJoinUrl(code)
  const joinHost = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'your-host'
    }

    return window.location.host
  }, [])

  return (
    <aside className="fixed right-4 top-4 z-20 w-[min(88vw,360px)] rounded-3xl border border-white/15 bg-slate-950/85 p-4 shadow-2xl backdrop-blur sm:right-6 sm:top-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Join</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-200 sm:text-base">{`Go to ${joinHost}`}</p>
        </div>

        <button
          aria-label={isCollapsed ? 'Expand join code card' : 'Collapse join code card'}
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
          onClick={() => setIsCollapsed((currentState) => !currentState)}
          type="button"
        >
          {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {isCollapsed ? (
        <p className="mt-3 text-sm font-semibold tracking-[0.35em] text-cyan-100">{formatSessionCode(code)}</p>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Code</p>
            <p className="mt-1 text-xl font-semibold tracking-[0.35em] text-white sm:text-2xl">
              {formatSessionCode(code)}
            </p>
          </div>

          <div className="hidden rounded-xl bg-white p-2 sm:block">
            <QRCodeSVG aria-label="Session QR code" size={72} value={joinUrl} />
          </div>
        </div>
      )}
    </aside>
  )
}
