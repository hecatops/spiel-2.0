import { useState, useEffect, useRef } from 'react'
import DialogueBox from './DialogueBox'
import SunsetEnding from './SunsetEnding'
import ShareSummary from './ShareSummary'
import styles from './StoryView.module.css'
import { continueStory } from '../api'
import Companion from './Companion'
import PixelIcon from './PixelIcon'
import Settings from './Settings'

const CHOICE_ICONS = ['flower', 'mushroom', 'star', 'moon', 'butterfly', 'leaf', 'gem', 'sparkle']

export default function StoryView({ playerName, sessionId, initialStory, initialChoices, onRestart, prefs, onPrefsChange }) {
  const [currentStory, setCurrentStory] = useState(initialStory)
  const [choices, setChoices] = useState(initialChoices)
  const [choiceCount, setChoiceCount] = useState(0)
  const [isEnding, setIsEnding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typingDone, setTypingDone] = useState(false)
  const [endingRevealed, setEndingRevealed] = useState(false)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentStory, isEnding, endingRevealed])

  async function handleChoice(choice) {
    setLoading(true)
    setError('')
    setTypingDone(false)

    try {
      const data = await continueStory({ session_id: sessionId, chosen_option: choice })
      setCurrentStory(data.story)
      setChoices(data.choices || [])
      setChoiceCount(c => c + 1)
      setIsEnding(data.is_ending)
    } catch (e) {
      setError(e.message || 'The story faltered… please try again.')
    } finally {
      setLoading(false)
    }
  }

  const companion = prefs?.companion || 'bunny'
  const turnLabel = isEnding ? 'The End' : `Turn ${choiceCount + 1}`

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.playerTag}>
            <Companion companion={companion} />
            {playerName}
          </span>
          <span className={styles.turnTag}>
            {isEnding && <PixelIcon name="sparkle" size={12} style={{ marginRight: 5 }} />}
            {turnLabel}
          </span>
          <button className={styles.settingsBtn} onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <PixelIcon name="settings" size={18} />
          </button>
          <button className={styles.restartBtn} onClick={onRestart}>
            <PixelIcon name="restart" size={18} />
            restart
          </button>
        </div>

        {/* Story box — final chapter gets a touch more breathing room */}
        <DialogueBox
          key={currentStory}
          text={currentStory}
          speakerName={isEnding ? 'Epilogue' : 'Narrator'}
          onTypingDone={() => setTypingDone(true)}
        />

        {/* Loading */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingEmoji}>
              <Companion companion={companion} />
            </div>
            <div className={styles.loadingText}>Weaving your tale…</div>
            <div className={styles.dots}>
              <div className={styles.dot} />
              <div className={styles.dot} />
              <div className={styles.dot} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className={styles.error} role="alert">⚠ {error}</p>}

        {/* Choices */}
        {!isEnding && !loading && typingDone && choices.length > 0 && (
          <div className={styles.choicesBlock}>
            <p className={styles.choicesLabel}>» What do you do?</p>
            <div className={styles.choicesList}>
              {choices.map((choice, i) => (
                <button
                  key={i}
                  className={'choice-card ' + styles.choiceBtn}
                  onClick={() => handleChoice(choice)}
                  disabled={loading}
                >
                  <PixelIcon name={CHOICE_ICONS[i % CHOICE_ICONS.length]} size={20} style={{ marginRight: 10 }} />
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ending — sunset scene plays first, then reveals share card + restart */}
        {isEnding && typingDone && (
          <div className={styles.endBlock}>
            <SunsetEnding playerName={playerName} onComplete={() => setEndingRevealed(true)} />

            {endingRevealed && (
              <>
                <ShareSummary sessionId={sessionId} playerName={playerName} />
                <button
                  className={'pill-btn ' + styles.newBtn}
                  onClick={onRestart}
                >
                  <PixelIcon name="sparkle" size={18} />
                  Start a New Adventure
                </button>
              </>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onChange={onPrefsChange}
      />
    </div>
  )
}
