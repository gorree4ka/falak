import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Orbit, Amount, AmountField, Button } from '../../components'
import { go } from '../Router'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, SPEND, money, movedDate } from '../../data/fixture'
import type { ScreenProps } from '../registry'
import { useDemoClock } from '../../clock'
import { swipedPast } from '../../motion'
import styles from './Obligation.module.css'

/**
 * Screen/HomeObligation — карта в ds/screens/obligation.md.
 *
 * Одна шторка на любое обязательство: перенести, пропустить, изменить.
 * Состояние — какое обязательство открыто; сайтмап обещал эту поверхность
 * с самого начала, а карточка платежа и строка резерва вели в никуда (№109).
 *
 * Жёсткое не запрещается двигать — оно двигается за подтверждением, и шторка
 * называет цену словами (§4.1): правило «ثابت» есть на нехватке, теперь оно
 * держится и здесь.
 */
export const OBLIGATION_STATES: Record<string, number> = {
  gamea: 18, internet: 20, subs: 22, mama: 25, future: 28,
}
export const stateOfDay = (day: number) =>
  Object.keys(OBLIGATION_STATES).find((k) => OBLIGATION_STATES[k] === day) ?? 'gamea'

type Action = 'move' | 'skip' | 'edit' | null

export function Obligation({ state = 'gamea' }: ScreenProps) {
  const day = OBLIGATION_STATES[state] ?? OBLIGATION_STATES.gamea
  const o = OBLIGATIONS.find((x) => x.day === day) ?? OBLIGATIONS[0]
  const hard = o.weight === 'hard'
  const [action, setAction] = useState<Action>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [edited, setEdited] = useState<number>(o.amount)
  const swipe = useRef<{ id: number; y: number; at: number } | null>(null)
  const clock = useDemoClock()
  const handled = useRef(false)
  const close = () => go('/screen/home')

  /* Свободные и норма — той же формулой, что в расчёте (§3.1): от рассвета, на дни до зарплаты. */
  const reserved = OBLIGATIONS.reduce((s, x) => s + x.amount, 0)
  const freeNow = MONEY.balance - reserved
  const share = (free: number) => Math.round((free + DAY.spentSinceDawn) / MONTH.daysLeft)
  const applied = hard && !confirmed ? null : action
  const freeAfter =
    applied === 'skip' ? freeNow + o.amount
    : applied === 'edit' ? freeNow + (o.amount - edited)
    : freeNow
  const moved = movedDate(o.day)
  const marks = OBLIGATIONS
    .filter((x) => !(applied === 'skip' && x.day === o.day))
    .map((x) => ({ day: applied === 'move' && x.day === o.day && moved.inMonth ? moved.day : x.day, amount: x.amount, weight: x.weight }))
    .filter((x) => !(applied === 'move' && x.day === moved.day && !moved.inMonth && x.amount === o.amount))

  const choose = (a: Action) => {
    setAction(action === a ? null : a)
    if (hard) setConfirmed(false)
  }

  return (
    <div className={styles.screen} data-enter="none">
      <div className={styles.backdrop}>
        <Orbit
          days={MONTH.days} today={MONTH.today} spend={SPEND}
          obligations={marks} past={PAST_EVENTS} dayFraction={clock.dayFraction} seconds
          selectedDay={applied === 'move' && moved.inMonth ? moved.day : o.day}
        />
      </div>
      <span className={styles.scrim} />

      <div className={styles.sheet}>
        <button
          type="button" className={styles.handle} aria-label="إغلاق" title="إغلاق"
          onPointerDown={(e) => { if (!e.isPrimary || e.button !== 0) return; swipe.current = { id: e.pointerId, y: e.clientY, at: performance.now() }; e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerUp={(e) => {
            const s = swipe.current; if (!s || s.id !== e.pointerId) return
            swipe.current = null; e.currentTarget.releasePointerCapture(e.pointerId)
            const threshold = parseFloat(getComputedStyle(e.currentTarget).getPropertyValue('--space-6'))
            const dy = e.clientY - s.y
            /* Мах вниз закрывает так же, как длинный сдвиг (см. `swipedPast`). */
            if (dy > 0 && swipedPast(dy, performance.now() - s.at, threshold)) { handled.current = true; close() }
          }}
          onPointerCancel={() => { swipe.current = null }}
          onLostPointerCapture={() => { swipe.current = null }}
          onClick={() => { if (handled.current) { handled.current = false; return } close() }}
        ><span aria-hidden="true" /></button>

        <div className={styles.header}>
          <span className={`${styles.title} ds-heading-xl`}>{o.title}</span>
          <bdi className={`${styles.marking} ds-marking`}>{o.day} SEP · {hard ? 'FIXED' : 'FLEXIBLE'}</bdi>
          <span className={styles.rule} />
          <button type="button" className={styles.close} aria-label="إغلاق" onClick={close}>
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className={styles.summary}>
          <div className={styles.row}>
            <Amount value={money(o.amount)} currency="درهم" size="lg" tone="reserved" />
          </div>
          <div className={styles.row}>
            <span className={hard ? styles.markHard : styles.markSoft} />
            <span className={`${styles.muted} ds-body-sm`}>
              {o.date} · {hard ? 'ثابت، لا يُقترح تأجيله' : 'مرن، يمكن تأجيله'}
            </span>
          </div>
        </div>

        {/* Что обязательство делает с месяцем — сейчас или после выбранного действия. */}
        <div className={styles.effect}>
          <div className={styles.row}>
            <span className={`${styles.muted} ds-body-sm`}>
              {applied ? 'يبقى حرًا بعد ذلك' : `يبقى حرًا حتى ${MONTH.nextSalary}`}
            </span>
            <span className={styles.grow} />
            <Amount value={money(freeAfter)} size="base" tone="free" />
          </div>
          <div className={styles.row}>
            <span className={`${styles.muted} ds-body-sm`}>نصيب اليوم</span>
            <span className={styles.grow} />
            <Amount value={money(share(freeAfter))} size="base" />
          </div>
          {applied === 'move' && (
            <span className={`${styles.faint} ds-body-sm`}>
              {moved.inMonth ? `تنتقل العلامة إلى ${moved.label}` : `تنتقل إلى ${moved.label} — تغادر المدار`}
            </span>
          )}
        </div>

        {hard && (
          <div className={styles.notice}>
            <div className={styles.row}>
              <span className={styles.markHard} />
              <span className="ds-body-sm-medium">ثابت — لا يُقترح تأجيله</span>
            </div>
            <span className={`${styles.muted} ds-body-sm`}>{o.reason} · التأجيل ممكن، لكن بعد تأكيد</span>
          </div>
        )}

        <div className={styles.actions}>
          <div className={styles.sectionHead}>
            <span className="ds-body-sm-medium">ما الذي يمكن فعله</span>
            <span className={styles.grow} />
            <bdi className={`${styles.faint} ds-marking`}>MOVE · SKIP · EDIT</bdi>
          </div>

          <ActionRow on={action === 'move'} onClick={() => choose('move')}
            title={`تأجيل أسبوعًا · إلى ${moved.label}`} note="الحر لا يتغيّر · تبقى محجوزة"
            amount={money(o.amount)} tone="muted" />
          <ActionRow on={action === 'skip'} onClick={() => choose('skip')}
            title="تخطّي هذا الشهر" note={`يبقى حرًا ${money(freeNow + o.amount)} · نصيب اليوم ${money(share(freeNow + o.amount))}`}
            amount={`+${money(o.amount)}`} tone="free" />
          <ActionRow on={action === 'edit'} onClick={() => choose('edit')}
            title="تعديل المبلغ" note={`المبلغ الآن ${money(o.amount)}`}
            amount={money(edited)} tone="muted" />
        </div>

        {action === 'edit' && (
          <div className={styles.edit}>
            <label>
              <AmountField caption="المبلغ" value={money(edited)} currency="درهم" />
              <input
                type="number" inputMode="numeric" min={0} step={10} aria-label="المبلغ"
                value={edited} onChange={(e) => setEdited(Math.max(0, Number(e.target.value) || 0))}
                style={{ position: 'absolute', inlineSize: 1, blockSize: 1, opacity: 0 }}
                autoFocus
              />
            </label>
          </div>
        )}

        {/* Жёсткое: выбранное действие исполняется вторым шагом, с названной ценой. */}
        {hard && action && !confirmed && (
          <div className={styles.confirm}>
            <Button full onClick={() => setConfirmed(true)}>
              {action === 'move' ? 'تأجيل رغم ذلك' : action === 'skip' ? 'تخطّي رغم ذلك' : 'تعديل رغم ذلك'}
            </Button>
            <Button full variant="ghost" onClick={() => setAction(null)}>إبقاء كما هو</Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Строка действия — ActionRow кита: название, «что станет», сумма. Нажимается целиком. */
function ActionRow({ title, note, amount, tone, on, onClick }: {
  title: string; note: string; amount: string; tone: 'free' | 'muted'; on: boolean; onClick: () => void
}) {
  return (
    <button type="button" className={styles.action} data-on={on} aria-pressed={on} onClick={() => onClick()}>
      <span className={styles.actionText}>
        <span className="ds-body-sm-medium">{title}</span>
        <span className={`${styles.muted} ds-body-sm`}>{on ? 'مُطبَّق · اضغط للتراجع' : note}</span>
      </span>
      <Amount value={amount} size="base" tone={on ? 'free' : tone} />
    </button>
  )
}
