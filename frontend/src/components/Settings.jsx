import { useState, useEffect } from 'react'
import styles from './Settings.module.css'
import PixelIcon from './PixelIcon'

const THEMES = [
  { id: 'sky', label: '☁️ Day', desc: 'Light Blue' },
  { id: 'sakura', label: '🌸 Sakura', desc: 'Soft Pink' },
  { id: 'forest', label: '🌿 Forest', desc: 'Calming Green' },
  { id: 'midnight', label: '🌙 Midnight', desc: 'Deep Blue' },
  { id: 'cyber', label: '⚡ Cyberpunk', desc: 'Dark Cyan and Pink' },
]

const COMPANIONS = [
  { id: 'bunny', label: 'Bunny' },
  { id: 'fox',   label: 'Fox' },
  { id: 'cat',   label: 'Cat' },
  { id: 'dog',   label: 'Dog' },
  { id: 'ghost', label: 'Ghost' },
  { id: 'chick', label: 'Chick' },
]

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem('spiel-prefs') || '{}')
  } catch { return {} }
}

function savePrefs(prefs) {
  localStorage.setItem('spiel-prefs', JSON.stringify(prefs))
}

export default function Settings({ open, onClose, prefs, onChange }) {
  if (!open) return null

  function set(key, val) {
    const next = { ...prefs, [key]: val }
    savePrefs(next)
    onChange(next)
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className={styles.panel + ' glass-panel'} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelIcon name="settings" size={20} />
            Settings
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>🎨 Theme</h3>
          <div className={styles.grid}>
            {THEMES.map(t => (
              <button
                key={t.id}
                className={styles.optionBtn + (prefs.theme === t.id || (!prefs.theme && t.id === 'sky') ? ' ' + styles.selected : '')}
                onClick={() => set('theme', t.id)}
              >
                <span className={styles.optLabel}>{t.label}</span>
                <span className={styles.optDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>🐾 Companion</h3>
          <div className={styles.companionRow}>
            {COMPANIONS.map(c => (
              <button
                key={c.id}
                className={styles.companionBtn + (prefs.companion === c.id || (!prefs.companion && c.id === 'bunny') ? ' ' + styles.selected : '')}
                onClick={() => set('companion', c.id)}
                title={c.label}
              >
                <PixelIcon name={c.id} size={32} />
                <span className={styles.compLabel}>{c.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
