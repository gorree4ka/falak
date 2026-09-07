import styles from './NoticeRow.module.css'

export interface NoticeRowProps {
  /**
   * Состояние денег: плашка тонируется целиком в свой цвет.
   * `stale` — состояние **данных**, а не денег: тон нейтральный,
   * потому что цвет в этом продукте занят состояниями денег (CONTRACT №15).
   */
  state: 'free' | 'reserved' | 'short' | 'stale'
  /** Латинская маркировка у внешнего края — она держит ряд при любой длине текста. */
  marking: string
  headline: string
  detail?: string
}

export function NoticeRow({ state, marking, headline, detail }: NoticeRowProps) {
  return (
    <div className={`${styles.plate} ${styles[state]}`}>
      <span className={styles.dot} />
      <span className={styles.text}>
        <span className="ds-body-sm-medium">{headline}</span>
        {detail && <span className={`${styles.detail} ds-label-xs`}>{detail}</span>}
      </span>
      <span className={`${styles.marking} ds-marking`}>{marking}</span>
    </div>
  )
}
