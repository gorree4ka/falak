import { useLayoutEffect, useRef } from 'react'
import { countUp, countTo } from '../../motion'
import styles from './Amount.module.css'

export interface AmountProps {
  value: string
  currency?: string
  /** hero — число дня в центре орбиты; display-lg — отправленная сумма на экране успеха; остальные — колонки и строки. */
  size?: 'hero' | 'xl' | 'display-lg' | 'lg' | 'md' | 'base'
  tone?: 'primary' | 'free' | 'reserved' | 'short' | 'muted'
  /** Считать от нуля при появлении: для числа, которое является результатом расчёта, а не константой. */
  count?: boolean
  /** Перетекать от прежнего значения при смене: для результата, который пересчитался от выбора человека. */
  flow?: boolean
}

const CLASS = {
  hero: 'ds-display-amount-hero',
  xl: 'ds-display-amount-xl',
  'display-lg': 'ds-display-amount-lg',
  lg: 'ds-amount-lg',
  md: 'ds-display-amount-md',
  base: 'ds-amount-base',
} as const

const numeric = (v: string) => Number(v.replace(/[^\d.-]/g, ''))

export function Amount({ value, currency, size = 'base', tone = 'primary', count = false, flow = false }: AmountProps) {
  const ref = useRef<HTMLElement>(null)
  /* Что человек видел последним: отсюда число поедет при смене входа. */
  const seen = useRef<number | null>(null)
  /* До первой отрисовки, иначе кадр успевает показать готовое число и только потом скатывается к нулю. */
  useLayoutEffect(() => {
    if (!ref.current) return
    const to = numeric(value)
    const from = seen.current
    seen.current = to
    if (flow && from != null) return countTo(ref.current, from, to)
    if (count && from == null) return countUp(ref.current, to)
  }, [count, flow, value])
  return (
    <span className={styles.wrap}>
      <bdi ref={ref} className={`${CLASS[size]} ${styles[tone]}`}>{value}</bdi>
      {currency && <span className={`${styles.currency} ds-mono-sm`}>{currency}</span>}
    </span>
  )
}
