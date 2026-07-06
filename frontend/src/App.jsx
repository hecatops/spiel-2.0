import { useState, useEffect } from 'react'
import Intro from './components/Intro'
import StoryView from './components/StoryView'
import Background from './components/Background'
import PixelIcon from './components/PixelIcon'
import Companion from './components/Companion'
import { startStory } from './api'
import { loadPrefs } from './components/Settings'

export default function App() {
  const [screen, setScreen] = useState('intro')
  const [playerName, setPlayerName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [initialStory, setInitialStory] = useState('')
  const [initialChoices, setInitialChoices] = useState([])
  const [loadError, setLoadError] = useState('')
  const [prefs, setPrefs] = useState(() => loadPrefs())

  useEffect(() => {
    const theme = prefs.theme || 'sky'
    document.documentElement.setAttribute('data-theme', theme === 'sky' ? '' : theme)
  }, [prefs.theme])

  function handlePrefsChange(next) {
    setPrefs(next)
  }

  async function handleStart(name, settingText) {
    setPlayerName(name)
    setScreen('loading')
    setLoadError('')

    try {
      const data = await startStory({ player_name: name, companion: prefs.companion || 'bunny', original_setting: settingText })
      setSessionId(data.session_id)
      setInitialStory(data.story)
      setInitialChoices(data.choices)
      setScreen('story')
    } catch (e) {
      setLoadError(e.message || 'The adventure could not begin. Please try again!')
      setScreen('intro')
    }
  }

  function handleRestart() {
    setScreen('intro')
    setPlayerName('')
    setSessionId('')
    setInitialStory('')
    setInitialChoices([])
  }

  const companion = prefs.companion || 'bunny'

  if (screen === 'loading') {
    return (
      <>
        <Background />
        <div style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}>
          <div style={{
            background: 'var(--panel)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid var(--theme-border)',
            borderRadius: '28px',
            padding: '48px 56px',
            textAlign: 'center',
            boxShadow: '0 8px 40px rgba(93,141,232,0.15)',
            animation: 'fade-in 0.4s ease',
          }}>
            <div style={{ fontSize: '56px', animation: 'float 1.5s ease-in-out infinite', marginBottom: '20px' }}>
              <Companion companion={companion} size={56} />
            </div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '11px',
              color: 'var(--dark-blue)',
              letterSpacing: '2px',
              marginBottom: '16px',
            }}>
              SPIEL
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: "'Pixelify Sans', sans-serif",
              fontSize: '16px',
              color: 'var(--text-soft)',
              marginBottom: '24px',
            }}>
              <PixelIcon name="sparkle" size={18} style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} />
              Opening Portal…
              <PixelIcon name="sparkle" size={18} style={{ animation: 'sparkle 1.5s ease-in-out 0.5s infinite' }} />
            </div>
            <div style={{
              fontFamily: "'Pixelify Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--text-soft)',
              opacity: 0.7,
              fontStyle: 'italic',
            }}>
              Collecting forgotten dreams…
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: 'var(--theme-accent)',
                  animation: `bounce-dot 1s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (screen === 'story') {
    return (
      <>
        <Background />
        <StoryView
          playerName={playerName}
          sessionId={sessionId}
          initialStory={initialStory}
          initialChoices={initialChoices}
          onRestart={handleRestart}
          prefs={prefs}
          onPrefsChange={handlePrefsChange}
        />
      </>
    )
  }

  return (
    <>
      <Background />
      <Intro
        onStart={handleStart}
        error={loadError}
        prefs={prefs}
        onPrefsChange={handlePrefsChange}
      />
    </>
  )
}
