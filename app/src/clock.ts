import { useEffect, useState } from 'react'
import { MONTH } from './data/fixture'

/**
 * Часы прототипа. Идут по-настоящему — секунда в секунду, — но отсчитываются
 * не от часов зрителя, а от опорного момента фикстуры (§2): 12 сентября, 9:41.
 *
 * **Почему не от часов зрителя.** Все числа экрана описывают именно это утро:
 * «صرفت 76 من 364 · يتجدّد كل فجر» и 288 доступных на сегодня. Открытый в
 * одиннадцать вечера экран показывал бы почти прожитые сутки при утренних
 * тратах — прибор соврал бы о том единственном, ради чего он есть. Живым здесь
 * должно быть **движение**, а не дата: сутки идут, сегмент едет, стрелка метёт.
 *
 * Момент загрузки — константа модуля, поэтому часы одни на все экраны сессии.
 */
const MINUTES_IN_DAY = 24 * 60

/** «9:41» → 581. Строка живёт в фикстуре, разбор — здесь. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const START = toMinutes(MONTH.now)
const FAJR = toMinutes(MONTH.fajr)
const LOADED = Date.now()

/** Текущее демо-время в минутах от полуночи, дробное. */
export function demoMinutes(): number {
  return START + (Date.now() - LOADED) / 60_000
}

/** «9:41» — как в системной строке. */
export function clockLabel(minutes: number = demoMinutes()): string {
  const total = Math.floor(minutes) % MINUTES_IN_DAY
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Доля прожитых суток от фаджра до фаджра, 0…1 — ровно то, что стоит в
 * фикстуре на опорный момент (0.187), только посчитанное, а не записанное.
 */
export function dayFractionAt(minutes: number = demoMinutes()): number {
  const since = (((minutes - FAJR) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  return since / MINUTES_IN_DAY
}

/** Секунды внутри минуты: ими секундная стрелка синхронизируется с часами. */
export function demoSeconds(): number {
  return (demoMinutes() * 60) % 60
}

/**
 * Часы для экрана. Перерисовка — на границе минуты, а не каждую секунду: за
 * минуту в кадре меняются надпись и четверть градуса сегмента, и будить React
 * шестьдесят раз ради этого незачем. Секунды двигает CSS, мимо главного потока.
 */
export function useDemoClock(): { time: string; dayFraction: number } {
  const [minutes, setMinutes] = useState(demoMinutes)
  useEffect(() => {
    let id = 0
    const schedule = () => {
      const untilNextMinute = (1 - (demoMinutes() % 1)) * 60_000
      id = window.setTimeout(() => {
        setMinutes(demoMinutes())
        schedule()
      }, Math.max(250, untilNextMinute))
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [])
  return { time: clockLabel(minutes), dayFraction: dayFractionAt(minutes) }
}
