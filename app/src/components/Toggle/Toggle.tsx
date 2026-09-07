import styles from './Toggle.module.css'

export interface ToggleProps {
  /** Включено — деньги держатся в резерве. */
  on: boolean
  onChange?: (next: boolean) => void
  label?: string
}

/**
 * Переключатель «держать в резерве». Включённое положение латунное:
 * тумблер управляет ровно тем, зарезервированы деньги или нет (CONTRACT №15).
 * В RTL включённое положение — слева, как в системном переключателе арабской локали.
 */
export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`${styles.track} ${on ? styles.on : styles.off}`}
      onClick={() => onChange?.(!on)}
    >
      <span className={styles.knob} />
    </button>
  )
}
