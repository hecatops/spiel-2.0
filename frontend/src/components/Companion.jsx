import { useEffect, useState } from 'react'
import PixelIcon from './PixelIcon'

export default function Companion({ companion = 'bunny', size = 32 }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 800)
    return () => clearInterval(id)
  }, [])

  const offsets = [0, -2, -4, -2]
  const y = offsets[frame]

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'inline-block',
        transform: `translateY(${y}px)`,
        transition: 'transform 0.3s ease',
        userSelect: 'none',
      }}
    >
      <PixelIcon name={companion} size={size} />
    </div>
  )
}
