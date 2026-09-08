import { useEffect, useMemo, useRef } from 'react'
import { demoSeconds } from '../../clock'
import { orbitReveal } from '../../motion'
import styles from './Orbit.module.css'

export type Weight = 'hard' | 'soft'

export interface Obligation {
  day: number
  amount: number
  weight: Weight
}

export interface OrbitProps {
  /** Длина месяца: 28, 29, 30 или 31. Шаг деления — 360 / days. */
  days: number
  /** Сегодняшнее число. */
  today: number
  /** Траты по дням: ключ — число месяца. Длина засечки берётся отсюда. */
  spend: Record<number, number>
  /** Обязательства впереди — из §4 фикстуры. */
  obligations: Obligation[]
  /** Пройденные события — из §5 фикстуры. */
  past: number[]
  /** Доля прожитых суток от фаджра до фаджра, 0…1. Стрелка внутри диска. */
  dayFraction: number
  /**
   * Секундная стрелка: волосяная засечка, оборот в минуту. Включается там, где
   * экран показывает **сейчас**; на сценарных кадрах (вечерняя нехватка) прибор
   * стоит, и метать секунды при остановленном часе было бы враньём.
   */
  seconds?: boolean
  /** Числа шкалы, которые подписываются. */
  numerals?: number[]
  /** Подпись у метки «сегодня». Отходит на 15 градусов назад по ходу месяца. */
  todayLabel?: string
  /** Выбранный день: кольцо не считает, счёт читается в шторке этого дня. */
  selectedDay?: number | null
  onSelectDay?: (day: number) => void
  dir?: 'rtl' | 'ltr'
  /** mini — тот же круг месяца в 96 px без гравировки: обод, дорожка, остаток, метки, сегодня. */
  size?: 'full' | 'mini'
  /**
   * Состояние дня. Форма метки «сейчас» постоянна, цвет говорит о состоянии:
   * при нехватке дуга и точка глиняные — нефритовая точка на глиняной дуге
   * означала бы «а здесь всё в порядке», и это неправда (CONTRACT №15, №78).
   */
  tone?: 'free' | 'short'
  children?: React.ReactNode
}

/* Мини-орбита: радиусы главной в пропорции ×0.216 — та же форма, не другая графика (CONTRACT №17). */
const MINI = { SIZE: 96, C: 48, R_OUTER: 46, R_ARC: 31, R_MARK: 33, MARK: 4 }

const SIZE = 444
const C = SIZE / 2

/* Радиусы — из ds/components.md, «Анатомия Orbit». Менять только вместе с ним. */
const R_OUTER = 212
const R_TICK = 176
const R_NUMERAL = 184
const R_MARK = 152
/*
  Подпись «сегодня» — в свободном поясе между метками (152) и засечками (176):
  на радиусе меток она накрывала метку соседнего обязательства (№119).
  Радиус не подбирается, а считается: подпись — прямоугольник 23×15, её дальний
  угол уходит от центра на полдиагонали, и он обязан остаться под полем
  гравировки с запасом. 176 − 4 − 13.7 ≈ 158. При 166 угол доставал до 179 и
  подпись ложилась на засечку своего же дня (№138).
*/
const LABEL_W = 23
const LABEL_H = 15
const R_TODAY_LABEL = Math.floor(176 - 4 - Math.hypot(LABEL_W / 2, LABEL_H / 2))
const R_ARC = 142
const R_DISC = 138
const R_DAY = 124.5
/* Секундная метка идёт по свободной полосе между суточной дорожкой (124.5) и
   ободом диска (138). Внутри дорожки она сливалась с началом дуги суток —
   два зелёных элемента в четырёх пикселях читались как один. */
const R_SECONDS = 131
/* Следы резца: диск выточен, а не нарисован. Поле числа держим чистым — след слышнее к ободу. */
const R_TURNING_MAX = 110
const TURNING = Array.from({ length: 35 }, (_, i) => 8 + i * 3)   // 8 … 110, шаг 3

const TICK_BASE = 12
const TICK_RANGE = 18
const MARK_SIZE = 8

export function Orbit({
  days,
  today,
  spend,
  obligations,
  past,
  dayFraction,
  seconds = false,
  numerals = [5, 10, 15, 20, 25, 30],
  todayLabel,
  selectedDay = null,
  onSelectDay,
  dir = 'rtl',
  size = 'full',
  tone = 'free',
  children,
}: OrbitProps) {
  const step = 360 / days
  const sign = dir === 'rtl' ? -1 : 1
  const short = tone === 'short'

  /* Раскрытие при появлении — до раннего возврата: хуки не зависят от размера. */
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!svgRef.current) return
    return orbitReveal(svgRef.current, { mini: size === 'mini' })
  }, [size])

  if (size === 'mini') {
    const { SIZE: M, C: MC, R_OUTER, R_ARC: MR_ARC, R_MARK: MR_MARK, MARK } = MINI
    const mAngle = (day: number) => ((-90 + sign * (day - 1) * step) * Math.PI) / 180
    const mAt = (r: number, day: number) => ({ x: MC + r * Math.cos(mAngle(day)), y: MC + r * Math.sin(mAngle(day)) })
    const a0 = mAngle(today), a1 = mAngle(days)
    const large = Math.abs((days - today) * step) > 180 ? 1 : 0
    const remaining = ['M', MC + MR_ARC * Math.cos(a0), MC + MR_ARC * Math.sin(a0),
      'A', MR_ARC, MR_ARC, 0, large, sign > 0 ? 1 : 0, MC + MR_ARC * Math.cos(a1), MC + MR_ARC * Math.sin(a1)].join(' ')
    const byDay = new Map<number, Weight>()
    for (const o of obligations) byDay.set(o.day, byDay.get(o.day) === 'hard' || o.weight === 'hard' ? 'hard' : 'soft')
    const todayPast = past.includes(today)
    const t = mAt(MR_ARC, today)
    return (
      <svg ref={svgRef} className={styles.mini} viewBox={`0 0 ${M} ${M}`} width={M} height={M} aria-hidden="true">
        <defs>
          {/* то же ядро метки, что у большого прибора: форма одна, диаметр другой */}
          <radialGradient id="falak-mark-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--mark-core)" />
            <stop offset="1" stopColor="var(--money-reserved)" />
          </radialGradient>
        </defs>
        <circle className={styles.ringOuter} cx={MC} cy={MC} r={R_OUTER} />
        <circle className={styles.miniTrack} cx={MC} cy={MC} r={MR_ARC} />
        <path className={styles.miniRemaining} d={remaining} data-motion="arc" />
        {past.filter((d) => d !== today).map((d) => {
          const p = mAt(MR_MARK, d)
          return <circle key={`p${d}`} className={styles.markPast} cx={p.x} cy={p.y} r={MARK / 2} />
        })}
        {[...byDay.entries()].filter(([d]) => d !== today).map(([d, w]) => {
          const p = mAt(MR_MARK, d)
          return <circle key={`m${d}`} className={w === 'hard' ? styles.markHard : styles.markSoft} cx={p.x} cy={p.y} r={MARK / 2} />
        })}
        {/* сегодня с пройденным событием — составной глиф: контур прошлого вокруг светящейся точки */}
        {todayPast && <circle className={styles.markPast} cx={t.x} cy={t.y} r={4} />}
        <circle className={styles.todayDot} cx={t.x} cy={t.y} r={3} />
      </svg>
    )
  }

  /** Угол дня в радианах. Первое число всегда на двенадцати часах. */
  const angle = (day: number) => ((-90 + sign * (day - 1) * step) * Math.PI) / 180
  const at = (r: number, day: number) => ({
    x: C + r * Math.cos(angle(day)),
    y: C + r * Math.sin(angle(day)),
  })

  const maxSpend = useMemo(
    () => Math.max(1, ...Object.values(spend)),
    [spend],
  )

  /** Радиальный отрезок: от r0 наружу, повёрнутый на угол дня. */
  const radial = (day: number, r0: number, len: number) => {
    const a = angle(day)
    return {
      x1: C + r0 * Math.cos(a),
      y1: C + r0 * Math.sin(a),
      x2: C + (r0 + len) * Math.cos(a),
      y2: C + (r0 + len) * Math.sin(a),
    }
  }

  /** Дуга по окружности радиуса r от дня a до дня b. */
  const arcPath = (r: number, fromDay: number, toDay: number) => {
    const a0 = angle(fromDay)
    const a1 = angle(toDay)
    const sweepDeg = Math.abs((toDay - fromDay) * step)
    const large = sweepDeg > 180 ? 1 : 0
    const sweep = sign > 0 ? 1 : 0
    return [
      'M', C + r * Math.cos(a0), C + r * Math.sin(a0),
      'A', r, r, 0, large, sweep, C + r * Math.cos(a1), C + r * Math.sin(a1),
    ].join(' ')
  }

  /**
   * Число шкалы стоит ВМЕСТО своей засечки, а не рядом с ней: на приборе
   * подписанное деление — это то же деление, только названное.
   * Первое число занято швом начала месяца.
   */
  /**
   * Подписывается каждое пятое число, кроме последнего дня месяца: оно стоит
   * в одном шаге от шва и подпись вставала бы вплотную к индексу начала.
   * Поэтому в тридцатидневном месяце 30 не подписано, а в тридцатиоднодневном —
   * подписано: там до шва два шага, места хватает.
   */
  const labelled = new Set(numerals.filter((d) => d <= days && d !== days))
  /* Сегодняшний день из общего поля исключён: он рисуется своей засечкой ниже,
     иначе на одном угле лежат две линии разной длины и читаются ступенькой. */
  const ticks = Array.from({ length: days }, (_, i) => i + 1)
    .filter((d) => d !== 1 && d !== today && !labelled.has(d))
  /*
    Суточная дуга растёт по часовой в обеих локалях. Ход идёт от солнечных
    часов северного полушария, где тень движется по часовой; в Залив это
    пришло тем же путём. Месяц снаружи — календарь, он читается по направлению
    письма; сутки внутри — прибор, и направление у него одно (№164).
    Верх круга — фаджр: там сутки начинаются и там же обновляется норма дня.
  */
  const dayElapsed = Math.max(0, Math.min(1, dayFraction))
  /* Точка входа стрелки берётся один раз: пересчёт на каждом кадре перезапускал бы ход. */
  const secondsStart = useRef(demoSeconds())
  /* Дуга в 14°, ромб — ровно посередине неё: метка сидит в отрезке, а не тянет его за собой. */
  const secondsTail = (() => {
    const a0 = ((-90 - 7) * Math.PI) / 180
    const a1 = ((-90 + 7) * Math.PI) / 180
    return `M ${C + R_SECONDS * Math.cos(a0)} ${C + R_SECONDS * Math.sin(a0)} `
      + `A ${R_SECONDS} ${R_SECONDS} 0 0 1 ${C + R_SECONDS * Math.cos(a1)} ${C + R_SECONDS * Math.sin(a1)}`
  })()
  /* Мини-орбита возвращается выше: сюда доходит только полный прибор. */
  const secondsHand = seconds

  /**
   * Метка ставится на день, а не на обязательство: два платежа одного числа
   * дают одну метку, иначе вторая просто скрывается под первой и исчезает молча.
   * Залито, если хотя бы одно обязательство дня жёсткое — день целиком не подвинуть.
   */
  const byDay = new Map<number, { weight: Weight; count: number }>()
  for (const o of obligations) {
    const prev = byDay.get(o.day)
    byDay.set(o.day, {
      weight: prev?.weight === 'hard' || o.weight === 'hard' ? 'hard' : 'soft',
      count: (prev?.count ?? 0) + 1,
    })
  }
  /** Обязательство на сегодня не рисуется отдельно: его берёт на себя метка дня. */
  const todayMark = byDay.get(today) ?? null
  const marks = [...byDay.entries()].filter(([d]) => d !== today)

  return (
    <svg
      ref={svgRef}
      className={`${styles.root} ${short ? styles.short : ''}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      aria-hidden={onSelectDay ? undefined : true}
    >
      <defs>
        {/*
          Затухание дуги: полная сила у «сегодня», к концу месяца слабее — яркий
          конец там, где стоит человек. Пол 0.45, а не 0.06: ниже этого дуга
          пропадает, и главное её показание — длина остатка — перестаёт читаться (№138).
          Ось задана в координатах кадра по хорде «сегодня» → конец месяца;
          в долях габарита она зависела от того, какой кусок круга занял путь.
        */}
        <linearGradient id="falak-remaining" gradientUnits="userSpaceOnUse"
          x1={at(R_ARC, today).x} y1={at(R_ARC, today).y}
          x2={at(R_ARC, days).x} y2={at(R_ARC, days).y}>
          <stop offset="0" stopColor="var(--orbit-remaining)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--orbit-remaining)" stopOpacity="0.45" />
        </linearGradient>
        {/* Фактура диска: плетение в две стороны, шаг 12 — тот же тайл, что в Figma. */}
        <pattern id="falak-hatch" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 L12 0 M-3 3 L3 -3 M9 15 L15 9" stroke="var(--texture-svg)" strokeWidth="1" opacity="var(--texture-svg-opacity)" />
          <path d="M0 0 L12 12 M-3 9 L3 15 M9 -3 L15 3" stroke="var(--texture-svg)" strokeWidth="1" opacity="var(--texture-svg-opacity)" />
        </pattern>
        {/*
          Материал прибора — свет с источником (patterns.md). Колодец накрывает
          весь диск: прозрачный стоп лежит на 124 % радиуса, у кромки остаётся
          около пятой части ядра — так в макете, и так диск читается глубоким
          целиком, а не тёмным пятном в середине (№171). Обод и кромка диска
          освещены с зенита; жёсткая метка горит изнутри. Днём все стопы равны
          своей краске, и градиентов на приборе нет.
        */}
        <radialGradient id="falak-well" cx="50%" cy="50%" r="62%">
          <stop offset="0" stopColor="var(--well-core)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--well-core)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="falak-engraving" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--orbit-engraving-lit)" />
          <stop offset="1" stopColor="var(--orbit-engraving-shade)" />
        </linearGradient>
        <linearGradient id="falak-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--orbit-engraving-lit)" />
          <stop offset="1" stopColor="var(--border-hairline)" />
        </linearGradient>
        <radialGradient id="falak-mark-core" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--mark-core)" />
          <stop offset="1" stopColor="var(--money-reserved)" />
        </radialGradient>
      </defs>

      {/* обод прибора — он шире экрана и срезается кадром */}
      <circle className={`${styles.ringOuter} ${styles.ringLit}`} cx={C} cy={C} r={R_OUTER - 0.5} data-motion="ring" />

      {/* поле гравировки: одна засечка на день, длина равна тратам этого дня */}
      {ticks.map((d) => {
        const isPast = d <= today
        const value = spend[d] ?? 0
        const len = isPast ? TICK_BASE + TICK_RANGE * Math.sqrt(value / maxSpend) : TICK_BASE
        const p = radial(d, R_TICK, len)
        return (
          <line
            key={`tick-${d}`}
            data-motion="tick"
            className={d === today ? styles.tickToday : isPast ? styles.tickPast : styles.tickAhead}
            x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          />
        )
      })}

      {/* индекс начала месяца: риска и треугольник остриём внутрь */}
      <line className={styles.originLine} {...radial(1, 166, 30)} />
      <polygon
        className={styles.originIndex}
        points={[
          `${C},${C - 198}`,
          `${C - 4.5},${C - 205}`,
          `${C + 4.5},${C - 205}`,
        ].join(' ')}
      />

      {/* цифры шкалы */}
      {[...labelled]
        .map((d) => {
          const p = at(R_NUMERAL, d)
          return (
            <text key={`num-${d}`} data-motion="numeral" className={styles.numeral} x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="central">
              {d}
            </text>
          )
        })}

      {/* дорожка месяца и непрожитый остаток */}
      <circle className={styles.arcTrack} cx={C} cy={C} r={R_ARC} />
      <path className={styles.arcRemaining} d={arcPath(R_ARC, today, days)} data-motion="arc" />

      {/* диск */}
      <circle className={styles.disc} cx={C} cy={C} r={R_DISC} />
      {/* колодец: число лежит глубже гравировки (foundation, «Свет») */}
      <circle className={styles.well} cx={C} cy={C} r={R_DISC} />
      <circle cx={C} cy={C} r={R_DISC} fill="url(#falak-hatch)" />
      {/* материал, а не узор: концентрические следы резца, как на выточенном диске астролябии */}
      <g className={styles.turning} aria-hidden="true">
        {TURNING.map((r) => (
          <circle key={r} cx={C} cy={C} r={r} style={{ opacity: 0.1 + 0.45 * (r / R_TURNING_MAX) }} />
        ))}
      </g>
      <circle className={styles.discRim} cx={C} cy={C} r={R_DISC} />

      {/* сутки: круг месяца снаружи, круг дня внутри */}
      <circle className={styles.dayTrack} cx={C} cy={C} r={R_DAY} />
      {/*
        Прожитые сутки — **дуга от фаджра**, а не метка на текущем часе. Короткий
        сегмент, стоявший на доле суток, читался как стрелка часов: рядом идут
        настоящие часы, и человек ждал, что отметка укажет на 9:43. Дуга от
        верха круга отвечает на вопрос, ради которого она есть, — «сколько
        суток прошло с рассвета», — и стрелкой быть перестаёт (№165).
      */}
      <g data-motion="day">
        <circle
          className={styles.dayElapsed}
          cx={C} cy={C} r={R_DAY}
          strokeDasharray={`${2 * Math.PI * R_DAY * dayElapsed} ${2 * Math.PI * R_DAY}`}
          transform={`rotate(-90 ${C} ${C})`}
        />
      </g>
      {/*
        Секунды. Оборот в минуту, ход задаёт CSS — движение идёт мимо главного
        потока и не будит React. Отрицательная задержка ставит стрелку туда, где
        она была бы, если бы шла с полуночи: так она согласована с надписью
        часов, а не начинает круг с момента открытия экрана.
      */}
      {secondsHand && (
        <g
          className={styles.seconds}
          style={{ transformOrigin: `${C}px ${C}px`, animationDelay: `${-secondsStart.current}s` }}
          aria-hidden="true"
        >
          {/* Отрезок, в середине которого сидит ромб: метка занимает свой участок круга. */}
          <path className={styles.secondsTail} d={secondsTail} />
          {/*
            Ромб, а не точка. Точка в этой системе означает обязательство, и
            пятая круглая метка на приборе читалась бы как шестое обязательство.
            Ромб не занят ничем и держит форму гравировки.
          */}
          <path
            className={styles.secondsMark}
            d={`M ${C} ${C - R_SECONDS - 3.6} L ${C + 3.2} ${C - R_SECONDS} L ${C} ${C - R_SECONDS + 3.6} L ${C - 3.2} ${C - R_SECONDS} Z`}
          />
        </g>
      )}

      {/* пройденные события — контур: прошлое не требует внимания */}
      {past.map((d) => {
        const p = at(R_MARK, d)
        return <circle key={`past-${d}`} className={styles.markPast} cx={p.x} cy={p.y} r={3.5} />
      })}

      {/* обязательства: залито — жёсткое, контур — подвижное. Одна метка на день. */}
      {marks.map(([day, { weight, count }]) => {
        const p = at(R_MARK, day)
        const cls = weight === 'hard' ? styles.markHard : styles.markSoft
        if (count === 1) {
          return <circle key={`mark-${day}`} data-motion="mark" className={cls} cx={p.x} cy={p.y} r={MARK_SIZE / 2} />
        }
        /* Два и больше — сегмент той же толщины: радиус остаётся постоянным,
           предел видимости не нарушается, а «здесь не одно» видно. */
        const len = MARK_SIZE + 10
        const a = angle(day)
        return (
          <rect
            key={`mark-${day}`}
            data-motion="mark"
            className={cls}
            x={p.x - len / 2} y={p.y - MARK_SIZE / 2}
            width={len} height={MARK_SIZE} rx={MARK_SIZE / 2}
            transform={`rotate(${(a * 180) / Math.PI + 90} ${p.x} ${p.y})`}
          />
        )
      })}

      {/*
        Сегодня — единственный светящийся объект кадра. Засечка та же, что у любого дня:
        её длина равна тратам (CONTRACT №22), выделяет цвет и толщина, а не лишние пиксели.
        Фиксированные 22 сообщали бы, что сегодня потрачено больше соседних дней.
      */}
      <line
        className={styles.todayTick}
        {...radial(today, R_TICK, TICK_BASE + TICK_RANGE * Math.sqrt((spend[today] ?? 0) / maxSpend))}
      />
      {(() => {
        const p = at(R_ARC, today)
        return (
          <>
            {/* Если на сегодня есть обязательство, метка дня и метка «сейчас» —
                один объект: гало залило бы соседнюю точку и она пропала бы. */}
            {todayMark && (
              <circle
                className={todayMark.weight === 'hard' ? styles.todayReservedHard : styles.todayReservedSoft}
                cx={p.x} cy={p.y} r={9}
              />
            )}
            <circle className={styles.todayDot} cx={p.x} cy={p.y} r={5} data-motion="today" />
          </>
        )
      })()}

      {todayLabel && (() => {
        /*
          Подпись стоит на радиальной линии своего дня, снаружи от точки: так она
          принадлежит дню без всяких оговорок. Прежняя редакция отводила её на 15°
          назад по ходу месяца — и подпись садилась то на шов начала месяца (2 октября),
          то на метку предыдущего обязательства (26 сентября). Оба случая ловит
          `execution/orbit_sweep.py` перебором, глазами их не видно (№119).

          Исключение одно: 1-е число само стоит на шве, и подпись отходит вперёд.
        */
        const a = today === 1 ? angle(today) + sign * (15 * Math.PI) / 180 : angle(today)
        return (
          <text className={styles.todayLabel}
            x={C + R_TODAY_LABEL * Math.cos(a)} y={C + R_TODAY_LABEL * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central">
            {todayLabel}
          </text>
        )
      })()}

      {/* Подсветка выбранного дня: кольцо показывает, о каком дне говорит шторка. */}
      {selectedDay != null && (() => {
        const p = at(R_MARK, selectedDay)
        return <circle className={styles.selected} cx={p.x} cy={p.y} r={13} />
      })()}

      {/*
        Цели нажатия на каждый день. Кольцо не считает — счёт читается в шторке,
        и попасть туда можно только отсюда: без этого перехода правило повисает.
        Цель 30 px при шаге между днями 31.8 — минимум по контракту выдержан.
      */}
      {onSelectDay && Array.from({ length: days }, (_, i) => i + 1).map((d) => {
        const p = at(R_MARK, d)
        return (
          <circle
            key={`hit-${d}`}
            className={styles.hit}
            cx={p.x} cy={p.y} r={15}
            onClick={() => onSelectDay(d)}
          />
        )
      })}

      <foreignObject x={C - R_DISC} y={C - R_DISC} width={R_DISC * 2} height={R_DISC * 2}>
        <div className={styles.center}>{children}</div>
      </foreignObject>
    </svg>
  )
}
