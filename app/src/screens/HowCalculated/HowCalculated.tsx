import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Orbit, ReserveRow, Amount } from '../../components'
import { go } from '../Router'
import { stateOfDay } from '../Obligation/Obligation'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, SPEND, SAVINGS, money } from '../../data/fixture'
import type { ScreenProps } from '../registry'
import { useDemoClock } from '../../clock'
import { swipedPast } from '../../motion'
import styles from './HowCalculated.module.css'

/**
 * Screen/HomeHowCalculated — карта в ds/screens/how-calculated.md.
 *
 * Шторка не объясняет расчёт, а отдаёт его: любую строку резерва можно выключить,
 * и число пересчитается. В Figma это сказано словами, здесь работает.
 *
 * Состояние `released` открывает кадр с отпущенным первым подвижным обязательством —
 * так видно, что расчёт живой, ещё до первого касания.
 */
export function HowCalculated({ state = 'base' }: ScreenProps) {
  const releasedDay = state === 'released' ? OBLIGATIONS.find((o) => o.weight === 'soft')?.day : undefined
  const [held, setHeld] = useState<Record<number, boolean>>(
    Object.fromEntries(OBLIGATIONS.map((o) => [o.day, o.day !== releasedDay])),
  )

  const swipe = useRef<{ id: number; y: number; at: number; done: boolean } | null>(null)
  const clock = useDemoClock()
  const handled = useRef(false)
  const close = () => go('/screen/home')

  const active = OBLIGATIONS.filter((o) => held[o.day])
  const reserved = active.reduce((s, o) => s + o.amount, 0)
  const balanceAtDawn = MONEY.balance + DAY.spentSinceDawn
  const freeAtDawn = balanceAtDawn - reserved
  const share = Math.round(freeAtDawn / MONTH.daysLeft)
  const remaining = share - DAY.spentSinceDawn

  return (
    <div className={styles.screen} data-enter="none">
      {/* Экран под шторкой не исчезает: тот же компонент кольца, не копия. */}
      <div className={styles.backdrop}>
        <Orbit
          days={MONTH.days}
          today={MONTH.today}
          spend={SPEND}
          obligations={active.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
          past={PAST_EVENTS}
          dayFraction={clock.dayFraction}
          seconds
        />
      </div>
      <span className={styles.scrim} />

      <div className={styles.sheet}>
        {/*
          Ручка здесь объявляет модальность — и обязана её исполнять: жест вниз
          или нажатие закрывают шторку целиком. Неподвижная ручка обещала жест,
          которого нет, и это ловил `inert_controls.py` (№141).
          Крестик остаётся: жест не виден с клавиатуры и не читается экранным
          диктором, а у крестика есть имя и цель 44.
        */}
        <button
          type="button"
          className={styles.handle}
          aria-label="إغلاق"
          title="إغلاق"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return
            swipe.current = { id: event.pointerId, y: event.clientY, at: performance.now(), done: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={(event) => {
            const start = swipe.current
            if (!start || start.id !== event.pointerId) return
            swipe.current = null
            event.currentTarget.releasePointerCapture(event.pointerId)
            /* Порог тот же, что у шторки главного, — `--space-6`; мах считается наравне. */
            const threshold = parseFloat(getComputedStyle(event.currentTarget).getPropertyValue('--space-6'))
            const dy = event.clientY - start.y
            if (dy > 0 && swipedPast(dy, performance.now() - start.at, threshold)) {
              handled.current = true
              close()
            }
          }}
          onPointerCancel={() => { swipe.current = null }}
          onLostPointerCapture={() => { swipe.current = null }}
          onClick={() => {
            if (handled.current) { handled.current = false; return }
            close()
          }}
        >
          <span aria-hidden="true" />
        </button>

        <div className={styles.header}>
          <span className="ds-heading-xl">كيف حُسب</span>
          <bdi className={`${styles.marking} ds-marking`}>DAY {MONTH.today} / {MONTH.days}</bdi>
          <span className={styles.rule} />
          <button type="button" className={styles.close} aria-label="إغلاق" onClick={close}>
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className={styles.formula}>
          <Row label="الرصيد عند الفجر" value={money(balanceAtDawn)} />
          <Row label="المحجوز" value={`−${money(reserved)}`} tone="reserved" />
          <Row label={`حر حتى ${MONTH.nextSalary}`} value={money(freeAtDawn)} rule
            /* Модель стоит на дате зарплаты — значит источник даты обязан быть назван (№114). */
            source="من سجل الرواتب · يصل يوم 1 من كل شهر" />
          <Row label="يومًا حتى الراتب" value={`÷ ${MONTH.daysLeft}`} tone="faint" />
          <Row label={`نصيب اليوم · ثُبّت الفجر ${MONTH.fajr}`} value={money(share)} rule />
          <Row label="صرفت منذ الفجر" value={`−${DAY.spentSinceDawn}`} tone="reserved" />
          <Row label="متاح للصرف اليوم" value={money(remaining)} rule hero />
        </div>

        <div className={styles.list}>
          <div className={styles.sectionHead}>
            <span className="ds-body-sm-medium">ما المحجوز · {money(reserved)}</span>
            <span className={styles.rule} />
            <bdi className={`${styles.markingFaint} ds-marking`}>HOLD OR RELEASE</bdi>
          </div>
          <p className={`${styles.hint} ds-body-sm`}>
            أطفئ أي بند — يُعاد الحساب فورًا وتختفي علامته من المدار
          </p>

          {OBLIGATIONS.map((o) => (
            <ReserveRow
              key={o.day}
              title={o.title}
              date={o.date}
              amount={money(o.amount)}
              weight={o.weight}
              held={held[o.day]}
              /* Жёсткое не отпускается одним касанием: тумблер ведёт в шторку, где названа цена (№109). */
              onToggle={(next) => (o.weight === 'hard' && !next ? go(`/screen/obligation/${stateOfDay(o.day)}`) : setHeld({ ...held, [o.day]: next }))}
              onOpen={() => go(`/screen/obligation/${stateOfDay(o.day)}`)}
            />
          ))}

          <div className={styles.note}>
            <span className={`${styles.faint} ds-body-sm`}>
              مدّخرات «المستقبل» · خارج الرصيد
            </span>
            <span className={styles.grow} />
            <Amount value={money(SAVINGS)} size="base" tone="muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Строка формулы. Линия отделяет итог, а не пункт: она стоит там, где получилось число. */
function Row({ label, value, tone = 'primary', rule = false, hero = false, source }: {
  label: string
  value: string
  tone?: 'primary' | 'reserved' | 'faint'
  rule?: boolean
  hero?: boolean
  /** Откуда взялось значение: строка под подписью, `text-faint`. */
  source?: string
}) {
  return (
    <div className={styles.row} data-rule={rule} data-hero={hero}>
      <span className={styles.rowLabel}>
        <span className={hero ? 'ds-body-sm-medium' : 'ds-body-sm'}>{label}</span>
        {source && <span className={`${styles.source} ds-label-xs`}>{source}</span>}
      </span>
      <span className={styles.grow} />
      <Amount value={value} size={hero ? 'lg' : 'base'} tone={hero ? 'free' : tone === 'faint' ? 'muted' : tone} />
    </div>
  )
}
