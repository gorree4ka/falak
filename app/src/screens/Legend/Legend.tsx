import { Orbit, Amount, Button } from '../../components'
import { StatusBar } from '../parts/StatusBar'
import { useDemoClock } from '../../clock'
import { go } from '../Router'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, SPEND, LEGEND, money } from '../../data/fixture'
import type { ScreenProps } from '../registry'
import styles from './Legend.module.css'

/**
 * Screen/HomeFirst — карта в ds/screens/legend.md.
 *
 * Первое открытие. Кольцо — единственное место, где продукт заводит собственный
 * алфавит: две формы метки, длина засечки, дуга и сегмент суток. Алфавит без
 * введения — это находка №7 аудита; легенда её закрывает (№110).
 *
 * Показывается один раз. Прибор при этом не приглушён: легенда объясняет то,
 * на что человек смотрит, а не заслоняет его.
 */
export function Legend(_: ScreenProps) {
  const clock = useDemoClock()
  const reserved = OBLIGATIONS.reduce((s, o) => s + o.amount, 0)
  const free = MONEY.balance - reserved

  return (
    <div className={styles.screen} data-enter="none">
      {/* Хром устройства на месте: это первое открытие приложения, а не оверлей поверх него. */}
      <StatusBar />
      <div className={styles.chrome} />
      <div className={styles.backdrop}>
        <Orbit
          days={MONTH.days} today={MONTH.today} spend={SPEND}
          obligations={OBLIGATIONS.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
          past={PAST_EVENTS} dayFraction={clock.dayFraction} seconds todayLabel="اليوم"
        >
          <span className={`${styles.muted} ds-body-sm`}>متاح للصرف اليوم</span>
          <Amount value={money(DAY.remaining)} currency="درهم" size="hero" />
          <span className={`${styles.muted} ds-body-sm`}>حر حتى {MONTH.nextSalary} · {money(free)}</span>
        </Orbit>
      </div>

      <div className={styles.sheet}>
        <span className={styles.handle} />

        <div className={styles.header}>
          <span className="ds-heading-xl">كيف تقرأ المدار</span>
          <bdi className={`${styles.marking} ds-marking`}>HOW TO READ</bdi>
          <span className={styles.rule} />
        </div>

        <p className={`${styles.lead} ds-body-sm`}>
          كل خط على المدار يعني شيئًا — لا شيء مرسوم للزينة.
        </p>

        <div className={styles.list}>
          {LEGEND.map((l) => (
            <div key={l.kind} className={styles.item}>
              <span className={styles.sample}>{sample(l.kind)}</span>
              <span className={styles.text}>
                <span className="ds-body-sm-medium">{l.title}</span>
                <span className={`${styles.muted} ds-body-sm`}>{l.note}</span>
              </span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button full onClick={() => go('/screen/home')}>فهمت</Button>
        </div>
      </div>
    </div>
  )
}

/** Образцы рисуются тем же, чем рисуется кольцо: одна форма на оба места. */
function sample(kind: 'hard' | 'soft' | 'tick' | 'arc') {
  if (kind === 'hard') return <span className={styles.markHard} />
  if (kind === 'soft') return <span className={styles.markSoft} />
  if (kind === 'tick') {
    /* Три засечки разной длины: правило «длина равна тратам» видно сразу. */
    return (
      <span className={styles.ticks}>
        {[8, 18, 12].map((h, i) => <i key={i} style={{ blockSize: h }} />)}
      </span>
    )
  }
  return (
    <svg className={styles.arcSample} width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="12" fill="none" stroke="var(--orbit-track)" strokeWidth="2" />
      <path d="M 15 3 A 12 12 0 0 1 27 15" fill="none" stroke="var(--orbit-remaining)" strokeWidth="2" />
      <circle cx="15" cy="15" r="6" fill="none" stroke="var(--orbit-track)" strokeWidth="1.5" />
      <path d="M 15 9 A 6 6 0 0 1 20.2 12" fill="none" stroke="var(--orbit-today)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
