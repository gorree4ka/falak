import { useLayoutEffect, useRef } from 'react'
import { lockDigits } from '../../motion'

export interface RateLockProps {
  /** Курс как строка фикстуры, например `13.42`. */
  value: string
}

/**
 * Курс, который защёлкивается при появлении. Читалке отдаётся готовое
 * значение через `aria-label`, перебор внутри скрыт от неё. Табличные цифры
 * даёт `ds-amount-base` (Plex Mono), поэтому строка не дёргается по ширине.
 */
export function RateLock({ value }: RateLockProps) {
  const ref = useRef<HTMLElement>(null)
  /* До первой отрисовки, как у countUp: иначе кадр покажет готовый курс и потом рассыплет его. */
  useLayoutEffect(() => {
    if (!ref.current) return
    return lockDigits(ref.current, value)
  }, [value])
  return (
    <span role="text" aria-label={value}>
      <bdi ref={ref} aria-hidden="true" data-motion="lock">{value}</bdi>
    </span>
  )
}
