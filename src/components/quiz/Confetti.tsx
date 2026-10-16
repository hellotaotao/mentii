import { useEffect, useRef } from 'react'

const CONFETTI_COLORS = ['#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#fb923c']
const PARTICLE_COUNT = 180
const DURATION_MS = 6000

type Particle = {
  color: string
  rotation: number
  rotationSpeed: number
  size: number
  velocityX: number
  velocityY: number
  x: number
  y: number
}

type ConfettiProps = {
  // Changing the key restarts the burst.
  burstKey: string | number
}

export default function Confetti({ burstKey }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 8,
      velocityX: (Math.random() - 0.5) * 6,
      velocityY: 2 + Math.random() * 4,
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
    }))

    const startedAt = performance.now()
    let frameId = 0

    const draw = (now: number) => {
      const elapsed = now - startedAt
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.globalAlpha = elapsed > DURATION_MS - 1000 ? Math.max(0, (DURATION_MS - elapsed) / 1000) : 1

      for (const particle of particles) {
        particle.x += particle.velocityX
        particle.y += particle.velocityY
        particle.velocityY += 0.05
        particle.velocityX *= 0.99
        particle.rotation += particle.rotationSpeed

        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.rotation)
        context.fillStyle = particle.color
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
        context.restore()
      }

      if (elapsed < DURATION_MS) {
        frameId = requestAnimationFrame(draw)
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    frameId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [burstKey])

  return <canvas aria-hidden="true" className="pointer-events-none fixed inset-0 z-30" ref={canvasRef} />
}
