import { useState, useEffect } from 'react'
import styles from './ShareSummary.module.css'
import PixelIcon from './PixelIcon'
import { getStorySummary } from '../api'

export default function ShareSummary({ sessionId, playerName }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getStorySummary({ session_id: sessionId })
        if (!cancelled) setSummary(data)
      } catch (e) {
        if (!cancelled) setError("Couldn't summon a summary right now.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  function buildShareText() {
    if (!summary) return ''
    return `${summary.emoji} ${summary.title}\n\n${summary.summary}\n\n— ${summary.player_name}'s ${summary.turns}-turn adventure on Spiel ✨`
  }

  async function handleCopy() {
    const text = buildShareText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card + ' glass-panel'}>
        <div className={styles.cardGlow} />

        {loading && (
          <div className={styles.skeleton}>
            <PixelIcon name="sparkle" size={24} style={{ animation: 'float 1.4s ease-in-out infinite' }} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        )}

        {!loading && error && (
          <p className={styles.errorText}>{error}</p>
        )}

        {!loading && !error && summary && (
          <>
            <div className={styles.label}>
              <PixelIcon name="book" size={12} style={{ marginRight: 6 }} />
              Your Tale, Remembered
            </div>
            <p className={styles.title}>{summary.emoji} {summary.title}</p>
            <p className={styles.summaryText}>{summary.summary}</p>
            <p className={styles.meta}>{summary.player_name} · {summary.turns} turns taken</p>
            <button className={'pill-btn ' + styles.copyBtn} onClick={handleCopy}>
              <PixelIcon name={copied ? 'star' : 'sparkle'} size={16} />
              {copied ? 'Copied!' : 'Copy to Share'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
