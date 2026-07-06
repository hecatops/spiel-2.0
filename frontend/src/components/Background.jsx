import { useEffect, useRef } from 'react'

export default function Background() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let tick = 0
    let raf

    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.6,
      size: Math.random() * 2.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }))

    const clouds = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random(),
      y: 0.05 + Math.random() * 0.3,
      w: 80 + Math.random() * 120,
      h: 30 + Math.random() * 30,
      speed: 0.00008 + Math.random() * 0.00006,
      opacity: 0.4 + Math.random() * 0.35,
    }))

    function drawCloud(x, y, w, h, opacity) {
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = '#fff'
      // main body
      ctx.beginPath()
      ctx.roundRect(x - w/2, y - h/2, w, h, h/2)
      ctx.fill()
      // top puff
      ctx.beginPath()
      ctx.arc(x - w*0.15, y - h/2, h*0.55, 0, Math.PI*2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + w*0.1, y - h/2, h*0.4, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    }

    function draw() {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Stars sparkle
      stars.forEach(s => {
        const brightness = 0.3 + 0.7 * Math.sin(tick * s.speed + s.phase)
        ctx.save()
        ctx.globalAlpha = brightness * 0.7
        ctx.fillStyle = '#B8D4FF'
        const px = s.x * W
        const py = s.y * H
        ctx.fillRect(px, py, s.size, s.size)
        // cross sparkle
        if (s.size > 1.5) {
          ctx.globalAlpha = brightness * 0.4
          ctx.fillRect(px - 2, py + s.size/2, s.size + 4, 1)
          ctx.fillRect(px + s.size/2, py - 2, 1, s.size + 4)
        }
        ctx.restore()
      })

      // Floating clouds
      clouds.forEach(c => {
        const x = ((c.x + tick * c.speed) % 1.3 - 0.15) * canvas.width
        drawCloud(x, c.y * canvas.height, c.w, c.h, c.opacity)
      })

      tick++
    }

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    function loop() {
      draw()
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
