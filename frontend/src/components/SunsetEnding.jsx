import { useEffect, useRef, useState } from 'react'

export default function SunsetEnding({ playerName, onComplete }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const [showCaption, setShowCaption] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowCaption(true), 1800)
    const t2 = setTimeout(() => onComplete?.(), 6500)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let tick = 0
    const S = 4
    const W = canvas.width
    const H = canvas.height
    const cols = Math.ceil(W / S)
    const rows = Math.ceil(H / S)

    function drawPixel(x, y, color) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return
      ctx.fillStyle = color
      ctx.fillRect(x * S, y * S, S, S)
    }

    function lerp(a, b, t) { return a + (b - a) * t }
    function hexToRgb(hex) {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
    }
    function rgbLerp(c1, c2, t) {
      const [r1,g1,b1] = hexToRgb(c1)
      const [r2,g2,b2] = hexToRgb(c2)
      return `rgb(${Math.round(lerp(r1,r2,t))},${Math.round(lerp(g1,g2,t))},${Math.round(lerp(b1,b2,t))})`
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const progress = Math.min(tick / 540, 1)

      // Dreamy sky (uses pastel palette)
      const skyTop1 = '#DCEFFF', skyTop2 = '#FFD6E8'
      const skyBot1 = '#EEF8FF', skyBot2 = '#FFB8D4'
      for (let row = 0; row < Math.floor(rows * 0.68); row++) {
        const t = row / (rows * 0.68)
        const dayColor = rgbLerp(skyTop1, skyBot1, t)
        const sunsetColor = rgbLerp(skyTop2, skyBot2, t)
        ctx.fillStyle = progress < 1 ? rgbLerp(dayColor, sunsetColor, progress) : sunsetColor
        ctx.fillRect(0, row * S, W, S)
      }

      // Sun
      const sunStartY = 4
      const sunEndY = Math.floor(rows * 0.62)
      const sunX = cols - 10
      const sunY = Math.round(lerp(sunStartY, sunEndY, progress))
      const sunColor = progress < 0.5
        ? rgbLerp('#8FB8FF', '#FFD6E8', progress * 2)
        : rgbLerp('#FFD6E8', '#FF9EC4', (progress - 0.5) * 2)

      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 4) drawPixel(sunX + dx, sunY + dy, sunColor)
        }
      }

      // Hills
      const groundStart = Math.floor(rows * 0.68)
      for (let col = 0; col < cols; col++) {
        const hillH = Math.round(3 * Math.sin(col * 0.09 + 1) + 2)
        for (let row = groundStart - hillH; row < rows; row++) {
          drawPixel(col, row, '#5D8DE8')
        }
      }
      const frontStart = Math.floor(rows * 0.76)
      for (let col = 0; col < cols; col++) {
        for (let row = frontStart; row < rows; row++) {
          drawPixel(col, row, '#39466B')
        }
      }

      // Tree silhouette
      const treeX = 5, treeY = frontStart - 7
      drawPixel(treeX + 1, treeY + 5, '#39466B')
      drawPixel(treeX + 1, treeY + 6, '#39466B')
      ;[[0,2],[1,2],[2,2],[0,1],[1,1],[2,1],[1,0]].forEach(([dx,dy]) => {
        drawPixel(treeX + dx, treeY + dy, '#39466B')
      })

      // Walking character
      const charStartX = 4
      const charEndX = cols + 4
      const charX = Math.round(lerp(charStartX, charEndX, progress))
      const charY = frontStart - 1
      const walkFrame = Math.floor(tick / 8) % 2

      drawPixel(charX, charY - 3, '#D9D2FF')
      drawPixel(charX, charY - 2, '#8FB8FF')
      drawPixel(charX, charY - 1, '#8FB8FF')
      drawPixel(charX - 1, charY - 2, '#D9D2FF')
      drawPixel(charX + 1, charY - 2, '#D9D2FF')
      if (walkFrame === 0) {
        drawPixel(charX - 1, charY, '#D9D2FF')
        drawPixel(charX + 1, charY - 1, '#D9D2FF')
      } else {
        drawPixel(charX + 1, charY, '#D9D2FF')
        drawPixel(charX - 1, charY - 1, '#D9D2FF')
      }

      tick++
    }

    function loop() {
      draw()
      if (tick <= 600) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }
    loop()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={240}
        style={{
          width: '100%',
          height: '200px',
          imageRendering: 'pixelated',
          display: 'block',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      />
      <p style={{
        marginTop: '20px',
        fontFamily: "'Pixelify Sans', sans-serif",
        fontSize: '18px',
        color: 'var(--text-soft)',
        fontStyle: 'italic',
        letterSpacing: '0.5px',
        opacity: showCaption ? 1 : 0,
        transform: showCaption ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 1.2s ease, transform 1.2s ease',
      }}>
        ✨ And so, {playerName} wandered into the twilight…
      </p>
    </div>
  )
}
