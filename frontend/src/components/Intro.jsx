import { useState } from 'react'
import styles from './Intro.module.css'
import Companion from './Companion'
import PixelIcon from './PixelIcon'
import Settings, { loadPrefs } from './Settings'

export default function Intro({ onStart, error, prefs, onPrefsChange }) {
  const [name, setName] = useState('')
  const [setting, setSetting] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  function handleSubmit() {
    if (!name.trim() || !setting.trim()) {
      setFieldError('Fill in both fields to begin your adventure!')
      return
    }
    setFieldError('')
    onStart(name.trim(), setting.trim())
  }

  const companion = prefs?.companion || 'bunny'

  return (
    <div className={styles.page}>
      <button
        className={styles.settingsBtn}
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <PixelIcon name="settings" size={22} />
      </button>

      <div className={styles.container}>
        <div className={styles.titleBlock}>
          <div className={styles.companionWrap}>
            <Companion companion={companion} size={48} />
          </div>
          <h1 className={styles.title}>SPIEL</h1>
         
        </div>

        <div className={styles.portal + ' glass-panel'}>
          <div className={styles.portalGlow} />

          <div className={styles.sparkleRow} aria-hidden="true">
            <PixelIcon name="sparkle" size={16} style={{ animation: 'sparkle 2s ease-in-out infinite' }} />
            <PixelIcon name="star" size={14} style={{ animation: 'sparkle 2s ease-in-out 0.7s infinite' }} />
            <PixelIcon name="sparkle" size={16} style={{ animation: 'sparkle 2s ease-in-out 1.4s infinite' }} />
          </div>

          <div className={styles.portalHeader}>
            <PixelIcon name="portal" size={24} />
            <span>Windowway</span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="player-name">
              <PixelIcon name="sparkle" size={12} style={{ marginRight: 6 }} />
              State your name, Hero
            </label>
            <input
              id="player-name"
              className="cozy-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="(or villain, you can be anyone!)"
              maxLength={32}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="world-setting">
              <PixelIcon name="sparkle" size={12} style={{ marginRight: 6 }} />
              Where are you wandering?
            </label>
            <textarea
              id="world-setting"
              className="cozy-input"
              value={setting}
              onChange={e => setSetting(e.target.value)}
              placeholder="A foggy mountain village… a magical forest… a damp room with yellow walls that extend forever…"
              maxLength={300}
              rows={3}
            />
          </div>

          {(fieldError || error) && (
            <p className={styles.error} role="alert">
              <PixelIcon name="star" size={14} style={{ marginRight: 6 }} />
              {fieldError || error}
            </p>
          )}

          <div className={styles.startWrap}>
            <button className={'pill-btn ' + styles.startBtn} onClick={handleSubmit}>
              <PixelIcon name="sparkle" size={18} />
              Begin Adventure
            </button>
          </div>
        </div>

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
