import styles from './AmountField.module.css'

export interface AmountFieldProps {
  caption: string
  value: string
  currency: string
  /** error — сумма недопустима: подчёркивание и подсказка глиной. */
  state?: 'default' | 'error'
  hint?: string
}

/**
 * Поле суммы на переводе. Подчёркивание вместо рамки: число — главный объект,
 * рамка вокруг него была бы второй рамкой на экране, где и так есть кадр.
 * Значение задаётся снаружи — быстрыми суммами; клавиатура — свойство оживления.
 */
export function AmountField({ caption, value, currency, state = 'default', hint }: AmountFieldProps) {
  return (
    <div className={styles.field} data-state={state}>
      {/* подпись поля — маркировка прибора, DS/Mono/xs, как в мастере 8:22 */}
      <span className={`${styles.caption} ds-mono-xs`}>{caption}</span>
      <div className={styles.valueRow} role="textbox" aria-readonly="true" aria-label={caption}>
        <bdi className={`${styles.value} ds-display-amount-md`}>{value}</bdi>
        <span className={`${styles.currency} ds-mono-sm`}>{currency}</span>
      </div>
      <span className={styles.underline} />
      {state === 'error' && hint && <span className={`${styles.hint} ds-body-sm`}>{hint}</span>}
    </div>
  )
}
