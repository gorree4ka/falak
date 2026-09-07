import { Amount, Button, Orbit } from '../../components'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, TRANSFER, RECEIVES_EGP, money } from '../../data/fixture'
import { StatusBar } from '../parts/StatusBar'
import { go } from '../Router'
import type { ScreenProps } from '../registry'
import styles from './SendHomeSuccess.module.css'

/**
 * Screen/SendHomeSuccess — карта в ds/screens/send-home-success.md.
 *
 * Отдельный кадр, а не тост: отправка семье — событие месяца. Главное число —
 * не «сколько ушло», а что осталось свободным: при исполненном плане столько же, сколько утром.
 */
export function SendHomeSuccess({ state = 'plan' }: ScreenProps) {
  const extra = state === 'extra'
  const freeAfter = extra ? MONEY.free - TRANSFER.amount : MONEY.free
  /* Норма дня — от рассвета (§3.1), поэтому при исполненном плане она ровно та же: 364. */
  const share = Math.round((freeAfter + DAY.spentSinceDawn) / MONTH.daysLeft)
  const marks = extra ? OBLIGATIONS : OBLIGATIONS.filter((o) => o.day !== TRANSFER.reserveDay)

  return (
    <div className={styles.screen}>
      <StatusBar />
      <div className={styles.header} />

      <div className={styles.confirmation}>
        <bdi className={`${styles.marking} ds-marking`}>SENT · {MONTH.now}</bdi>
        <span className="ds-heading-xl">تم الإرسال</span>
        <Amount value={money(TRANSFER.amount)} currency="درهم" size="display-lg" tone="free" />
        <span className={`${styles.muted} ds-body-base`}>{money(RECEIVES_EGP[TRANSFER.amount])} جنيه</span>
        <span className={`${styles.muted} ds-body-sm`}>تصل إلى ماما اليوم قبل {TRANSFER.arrival}</span>
      </div>

      <div className={styles.plate}>
        <span className={styles.numbers}>
          <span className={`${styles.muted} ds-body-sm`}>يبقى حرًا</span>
          <Amount value={money(freeAfter)} currency="درهم" size="md" tone="free" />
          <span className={`${styles.faint} ds-body-sm`}>
            نصيب اليوم {share} · {extra ? `محجوز ${TRANSFER.reserveDay} ${MONTH.label} يبقى كما هو` : `نُفِّذ محجوز ${TRANSFER.reserveDay} ${MONTH.label} مبكرًا`}
          </span>
        </span>
        <span className={styles.grow} />
        <Orbit
          size="mini"
          days={MONTH.days}
          today={MONTH.today}
          spend={{}}
          obligations={marks.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
          past={[...PAST_EVENTS, MONTH.today]}
          dayFraction={MONTH.dayFraction}
        />
      </div>

      <span className={styles.grow} />

      <div className={styles.actions}>
        <Button full onClick={() => go('/')}>تم</Button>
        <Button full variant="ghost" onClick={() => go('/screen/send-home')}>إرسال لشخص آخر</Button>
      </div>
    </div>
  )
}
