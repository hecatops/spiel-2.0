import styles from './DialogueBox.module.css'
import { useTypewriter } from './useTypewriter'
import PixelIcon from './PixelIcon'

export default function DialogueBox({
  text,
  speakerName,
  onTypingDone,
  dialogueStyle = 'classic',
}) {
  console.log('DialogueBox render:', text)

  const { displayed, done, skip } = useTypewriter(
    text,
    24,
    onTypingDone
  )

  return (
    <div
      className={styles.wrapper}
      onClick={!done ? skip : undefined}
      style={{ cursor: done ? 'pointer' : 'default' }}
      data-dialogue={dialogueStyle}
    >
      {speakerName && (
        <div className={styles.speaker}>
          <PixelIcon name="book" size={14} />
          {speakerName}
        </div>
      )}

      <div className={styles.box}>
        <p className={styles.text}>
          {displayed}
          {!done && <span className={styles.cursor}>▮</span>}
        </p>

        {!done && (
          <span className={styles.hint}>tap to skip</span>
        )}

        {done && (
          <span className={styles.arrow}>▼</span>
        )}
      </div>
    </div>
  )
}