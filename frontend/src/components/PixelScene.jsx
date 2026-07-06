import { useEffect, useRef } from 'react'

// Draws a looping cozy pixel landscape: rolling hills, a little tree, clouds drifting
export default function PixelScene({ style = {} }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let tick = 0

    function drawPixel(x, y, color, size = 4) {
      ctx.fillStyle = color
      ctx.fillRect(x * size, y * size, size, size)
    }

    function draw() {
      const W = canvas.width
      const H = canvas.height
      const S = 4 // pixel size
      const cols = Math.ceil(W / S)
      const rows = Math.ceil(H / S)

      ctx.clearRect(0, 0, W, H)

      // Sky gradient (pixel rows)
      const skyColors = ['#87CEEB', '#9BD4EE', '#AFDBF5', '#C2E5F8']
      for (let row = 0; row < rows * 0.65; row++) {
        const ci = Math.floor((row / (rows * 0.65)) * skyColors.length)
        ctx.fillStyle = skyColors[Math.min(ci, skyColors.length - 1)]
        ctx.fillRect(0, row * S, W, S)
      }

      // Clouds drift left
      const cloudOffset = Math.floor(tick * 0.3) % (cols + 20)
      const clouds = [
        { x: 8, y: 3, w: 6, h: 2 },
        { x: 22, y: 5, w: 8, h: 2 },
        { x: 40, y: 2, w: 5, h: 2 },
      ]
      clouds.forEach(c => {
        const cx = ((c.x + cols - cloudOffset) % (cols + 20)) - 10
        for (let dx = 0; dx < c.w; dx++) {
          for (let dy = 0; dy < c.h; dy++) {
            drawPixel(cx + dx, c.y + dy, '#FFFEF0', S)
          }
        }
        // puff top
        for (let dx = 1; dx < c.w - 1; dx++) {
          drawPixel(cx + dx, c.y - 1, '#FFFEF0', S)
        }
      })

      // Sun
      const sunX = cols - 8
      const sunY = 4
      const sunColor = '#FFD54F'
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 3) {
            drawPixel(sunX + dx, sunY + dy, sunColor, S)
          }
        }
      }

      // Hills (ground)
      const groundStart = Math.floor(rows * 0.62)
      // Back hill (lighter green)
      for (let col = 0; col < cols; col++) {
        const hillH = Math.round(3 * Math.sin(col * 0.08 + 1) + 2)
        for (let row = groundStart - hillH; row < rows; row++) {
          drawPixel(col, row, row === groundStart - hillH ? '#6FAF83' : '#4A7C59', S)
        }
      }

      // Front ground strip
      const frontStart = Math.floor(rows * 0.72)
      for (let col = 0; col < cols; col++) {
        for (let row = frontStart; row < rows; row++) {
          drawPixel(col, row, row === frontStart ? '#8BC34A' : '#558B2F', S)
        }
      }

      // Pixel tree (left side)
      const treeX = 6
      const treeY = frontStart - 6
      // trunk
      drawPixel(treeX + 1, treeY + 4, '#5C3A1E', S)
      drawPixel(treeX + 1, treeY + 5, '#5C3A1E', S)
      // canopy
      const treeColors = ['#2E5940', '#4A7C59', '#6FAF83']
      const canopy = [
        [0, 2], [1, 2], [2, 2],
        [0, 1], [1, 1], [2, 1],
        [1, 0],
      ]
      canopy.forEach(([dx, dy], i) => {
        drawPixel(treeX + dx, treeY + dy, treeColors[i % 3], S)
      })

      // Flowers scattered on front ground
      const flowerPositions = [12, 20, 28, 35, 45, 52]
      const flowerColors = ['#E8A838', '#FF7043', '#E91E63', '#9C27B0']
      flowerPositions.forEach((fx, i) => {
        drawPixel(fx, frontStart - 1, flowerColors[i % flowerColors.length], S)
        drawPixel(fx, frontStart, '#4A7C59', S)
      })

      tick++
    }

    function loop() {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={200}
      style={{
        width: '100%',
        height: '160px',
        imageRendering: 'pixelated',
        display: 'block',
        ...style,
      }}
    />
  )
}
