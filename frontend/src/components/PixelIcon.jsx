// Renders a pixel-art SVG from /icons/ with pixelated rendering
export default function PixelIcon({ name, size = 24, style = {}, alt = '' }) {
  return (
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={!alt}
      style={{
        imageRendering: 'pixelated',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
