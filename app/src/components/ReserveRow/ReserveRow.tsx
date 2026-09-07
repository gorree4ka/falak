import { Toggle } from '../Toggle'
import styles from './ReserveRow.module.css'

export interface ReserveRowProps {
  title: string
  date: string
  amount: string
  /** Жёсткое нельзя подвинуть, подвижное можно перенести или пропустить. */
  weight: 'hard' | 'soft'
  held: boolean
  onToggle?: (next: boolean) => void
  /** Нажатие на строку (не на тумблер) открывает шторку обязательства. */
  onOpen?: () => void
}

export function ReserveRow({ title, date, amount, weight, held, onToggle, onOpen }: ReserveRowProps) {
  return (
    <div className={styles.row} data-held={held} onClick={onOpen ? () => onOpen() : undefined}
      role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } : undefined}>
      <span className={weight === 'hard' ? styles.markHard : styles.markSoft} />
      <span className={styles.text}>
        <span className="ds-body-sm-medium">{title}</span>
        <bdi className={`${styles.date} ds-body-sm`}>{date}</bdi>
      </span>
      <span className={`${styles.amount} ds-amount-base`}>{amount}</span>
      <span className={styles.spacer} />
      {/* тумблер живёт своей жизнью: его нажатие не открывает шторку */}
      <span onClick={(e) => e.stopPropagation()}>
        <Toggle on={held} onChange={onToggle} label={title} />
      </span>
    </div>
  )
}
