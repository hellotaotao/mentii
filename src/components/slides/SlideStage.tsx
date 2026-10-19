import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PresentationTheme } from '../../lib/presentationTheme'

export const STAGE_WIDTH = 1600
export const STAGE_HEIGHT = 900

type SlideStageProps = {
  // Thumbnails are decorative copies of a slide; hide them from assistive tech.
  ariaHidden?: boolean
  children: ReactNode
  className?: string
  theme: PresentationTheme
}

// Renders slide content on a fixed 1600x900 canvas and scales it to fit the
// container, so thumbnails, the editor canvas and the big screen match exactly.
export default function SlideStage({ ariaHidden = false, children, className = '', theme }: SlideStageProps) {
  const outerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const element = outerRef.current

    if (!element || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const { height, width } = entry.contentRect

      if (width > 0 && height > 0) {
        setScale(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT))
      }
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className={`slide-theme-${theme} relative overflow-hidden bg-slide-bg ${className}`}
      ref={outerRef}
    >
      <div
        className="absolute left-1/2 top-1/2 text-slide-fg"
        style={{
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: STAGE_WIDTH,
        }}
      >
        {children}
      </div>
    </div>
  )
}
