import { useLayoutEffect, useRef } from 'react'
import { countUp } from '../../motion'
import styles from './Amount.module.css'

export interface AmountProps {
  value: string
  currency?: string
  /** hero — число дня в центре орбиты; display-lg — отправленная сумма на экране успеха; остальные — колонки и строки. */
  size?: 'hero' | 'xl' | 'display-lg' | 'lg' | 'md' | 'base'
  tone?: 'primary' | 'free' | 'reserved' | 'short' | 'muted'
  /** Считать от нуля при появлении: для числа, которое является результатом расчёта, а не константой. */
  count?: boolean
}

const CLASS = {
  hero: 'ds-display-amount-hero',
  xl: 'ds-display-amount-xl',
  'display-lg': 'ds-display-amount-lg',
  lg: 'ds-amount-lg',
  md: 'ds-display-amount-md',
  base: 'ds-amount-base',
} as const

export function Amount({ value, currency, size = 'base', tone = 'primary', count = false }: AmountProps) {
  const ref = useRef<HTMLElement>(null)
  /* До первой отрисовки, иначе кадр успевает показать готовое число и только потом скатывается к нулю. */
  useLayoutEffect(() => {
    if (!count || !ref.current) return
    return countUp(ref.current, Number(value.replace(/[^\d.-]/g, '')))
  }, [count, value])
  return (
    <span className={styles.wrap}>
      <bdi ref={ref} className={`${CLASS[size]} ${styles[tone]}`}>{value}</bdi>
      {currency && <span className={`${styles.currency} ds-mono-sm`}>{currency}</span>}
    </span>
  )
}
