import styles from './ThemeToggle.module.css'

interface Props {
  theme: 'night' | 'day'
  onTheme: (t: 'night' | 'day') => void
}

/** Ночь / День — той же формой, что переключатель периода в шторке: углубление и приподнятый сегмент. */
export function ThemeToggle({ theme, onTheme }: Props) {
  return (
    <div className={styles.switch} role="group" aria-label="Тема">
      {(['night', 'day'] as const).map((t) => (
        <button
          key={t}
          type="button"
          className={`${theme === t ? styles.segOn : styles.seg} ds-body-sm`}
          aria-pressed={theme === t}
          onClick={() => onTheme(t)}
        ><span>{t === 'night' ? 'Ночь' : 'День'}</span></button>
      ))}
    </div>
  )
}
