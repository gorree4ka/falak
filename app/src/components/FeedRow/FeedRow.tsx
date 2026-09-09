import type { ReactNode } from 'react'
import styles from './FeedRow.module.css'

export interface FeedRowProps {
  group: string
  detail: string
  /** Строка или узел: курс на переводе приходит компонентом, который его защёлкивает. */
  amount: ReactNode
  last?: boolean
}

/** Лента по смыслу: группа трат, а не категория, которую пользователь не выбирал. */
export function FeedRow({ group, detail, amount, last = false }: FeedRowProps) {
  return (
    <div className={styles.row} data-last={last}>
      <span className={`${styles.group} ds-body-sm-medium`}>{group}</span>
      <span className={`${styles.detail} ds-body-sm`}>{detail}</span>
      <span className={styles.spacer} />
      <span className={`${styles.amount} ds-amount-base`}>{amount}</span>
    </div>
  )
}
