import { useState, useEffect, useRef } from 'react'

export function useTypewriter(text, speed = 28, onDone) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  const indexRef = useRef(0)
  const timeoutRef = useRef()

  useEffect(() => {
    console.log('Typewriter start:', text)

    setDisplayed('')
    setDone(false)
    indexRef.current = 0

    clearTimeout(timeoutRef.current)

    function type() {
      console.log('tick', indexRef.current)

      if (indexRef.current >= text.length) {
        setDone(true)
        onDone?.()
        return
      }

      indexRef.current++
      setDisplayed(text.slice(0, indexRef.current))

      timeoutRef.current = setTimeout(type, speed)
    }

    timeoutRef.current = setTimeout(type, speed)

    return () => {
      console.log('cleanup')
      clearTimeout(timeoutRef.current)
    }
  }, [text, speed])

  function skip() {
    clearTimeout(timeoutRef.current)
    setDisplayed(text)
    setDone(true)
    onDone?.()
  }

  return { displayed, done, skip }
}