import { useLayoutEffect, useRef } from 'react'
import { countTo } from '../../motion'

export interface FlowNumberProps {
  /** Число как в фикстуре: без форматирования, форматирует сам. */
  value: number
}

/** Число в строке текста, которое перетекает от прежнего значения к новому — та же логика, что `Amount flow`. */
export function FlowNumber({ value }: FlowNumberProps) {
  const ref = useRef<HTMLElement>(null)
  const seen = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const from = seen.current
    seen.current = value
    if (from != null) return countTo(ref.current, from, value)
  }, [value])
  return <bdi ref={ref} data-motion="flow">{value.toLocaleString('en-US')}</bdi>
}
