import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AmountField, Amount, Avatar, Button, FeedRow, FlowNumber, Orbit, RateLock, SliderConfirm, Toggle } from '../../components'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, TRANSFER, RECIPIENTS, RECEIVES_EGP, money } from '../../data/fixture'
import { StatusBar } from '../parts/StatusBar'
import { go } from '../Router'
import type { ScreenProps } from '../registry'
import styles from './SendHome.module.css'

/**
 * Screen/SendHome — карта в ds/screens/send-home.md.
 *
 * Перевод — действие над человеком: получатель уже выбран, решение одно — сколько.
 * Числа считаются по §7.1–7.2: всё в пределах резерва маме исполняет план и свободных
 * не трогает; всё сверх — уходит из свободных и меняет норму дня.
 */
export function SendHome({ state = 'plan' }: ScreenProps) {
  /*
    Получатель — состояние экрана, а не константа. «Перевод» у мамы и у Юсуфа —
    разные дела: у неё граница и курс, у него те же дирхамы и приход сразу (§7.3).
    Различается ровно то, что связано с валютой; всё остальное — один экран.
  */
  const who = RECIPIENTS.find((r) => r.id === state) ?? RECIPIENTS[0]
  const local = who.kind === 'local'
  const [amount, setAmount] = useState(state === 'insufficient' ? TRANSFER.insufficient : who.amount)
  const [executePlan, setExecutePlan] = useState(state !== 'extra')
  /* Резерв есть только у мамы (§4): любой перевод Юсуфу — сверх плана. */
  const hasReserve = !local
  const [picking, setPicking] = useState(false)

  const reserve = hasReserve ? OBLIGATIONS.find((o) => o.day === TRANSFER.reserveDay)?.amount ?? 0 : 0
  const fromReserve = executePlan && hasReserve ? Math.min(amount, reserve) : 0
  const extra = amount - fromReserve
  const available = MONEY.free + (executePlan && hasReserve ? reserve : 0)
  const insufficient = amount > available
  const freeAfter = MONEY.free - extra
  /* Норма дня считается от рассвета (§3.1): к свободным прибавляется уже потраченное сегодня. */
  const share = Math.round((freeAfter + DAY.spentSinceDawn) / MONTH.daysLeft)
  const egp = RECEIVES_EGP[amount]
  /* план исполнен целиком — метка 25-го уходит с кольца ещё до подтверждения */
  const marks = OBLIGATIONS.filter((o) => !(hasReserve && executePlan && o.day === TRANSFER.reserveDay && amount >= reserve))

  return (
    <div className={styles.screen}>
      <StatusBar />

      {/* Порядок — порядок чтения: «назад» первым, значит у ведущего правого края, как в iOS на арабском. */}
      <div className={styles.header}>
        <button type="button" className={styles.back} aria-label="رجوع" onClick={() => go('/')}>
          <ChevronRight size={20} strokeWidth={1.8} />
        </button>
        <span className={styles.grow} />
        <span className={`${styles.title} ds-heading-xl`}>{local ? 'تحويل' : 'تحويل للأهل'}</span>
        <span className={styles.grow} />
        {/* распорка шириной с кнопку держит заголовок по центру кадра */}
        <span className={styles.backGhost} aria-hidden="true" />
      </div>

      {/* Шеврон обещал смену получателя — теперь она есть: ряд людей выбирается тут же (№116). */}
      <button type="button" className={styles.recipient} onClick={() => setPicking(!picking)}
        aria-expanded={picking} aria-label="تغيير المستلم">
        <Avatar size={72} name={who.name} initial={who.initial} photo={who.photo} />
        <span className={styles.who}>
          <span className="ds-body-lg">{who.name}</span>
          <span className={`${styles.muted} ds-body-sm`}>{who.city} · {who.note}</span>
          <bdi className={`${styles.faint} ds-mono-xs`}>{who.account}</bdi>
        </span>
        <ChevronLeft size={20} strokeWidth={1.8} className={styles.faint} />
      </button>

      {picking && (
        <div className={styles.picker} role="listbox" aria-label="المستلم">
          {RECIPIENTS.filter((r) => r.id !== who.id).map((r) => (
            <button key={r.id} type="button" className={styles.pick} role="option" aria-selected={false}
              onClick={() => go(`/screen/send-home/${r.id}`)}>
              <Avatar size={40} name={r.name} initial={r.initial} photo={r.photo} />
              <span className={styles.who}>
                <span className="ds-body-sm-medium">{r.name}</span>
                <span className={`${styles.muted} ds-body-sm`}>{r.city} · {r.note}</span>
              </span>
            </button>
          ))}
          {/* Гамея — не перевод, а взнос по обязательству: чип ведёт туда, где им управляют. */}
          <button type="button" className={styles.pick} onClick={() => go('/screen/obligation/gamea')}>
            <Avatar size={40} name="الجمعية · 8" initial="ج" />
            <span className={styles.who}>
              <span className="ds-body-sm-medium">الجمعية · 8</span>
              <span className={`${styles.muted} ds-body-sm`}>اشتراك 18 سبتمبر · ليس تحويلًا</span>
            </span>
          </button>
        </div>
      )}

      <div className={styles.amount}>
        {/*
          Клавиатура суммы: вид даёт поле кита, ввод принимает input внутри той же метки.
          Нажатие на число открывает клавиатуру, быстрые суммы остаются подсказкой (№116).
        */}
        <label className={styles.amountField}>
          <AmountField
            caption="المبلغ"
            value={money(amount)}
            currency="درهم"
            state={insufficient ? 'error' : 'default'}
            hint={`أكبر من المتاح · ${money(available)} درهم`}
          />
          <input
            className={styles.amountInput} type="number" inputMode="numeric" min={0} step={50}
            aria-label="المبلغ" value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        {insufficient ? (
          <button type="button" className={styles.release} onClick={() => go('/screen/how-calculated')}>
            <span className="ds-body-sm-medium">تحرير المحجوز</span>
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
        ) : local ? (
          <span className={`${styles.muted} ds-body-sm`}>يستلم {who.name} {money(amount)} درهم</span>
        ) : (
          egp != null && <span className={`${styles.muted} ds-body-sm`}>تستلم ماما {money(egp)} جنيه</span>
        )}
        <div className={styles.quick}>
          {who.quick.map((q) => (
            <Button key={q} variant={q === amount ? 'secondary' : 'ghost'} onClick={() => setAmount(q)}>{money(q)}</Button>
          ))}
        </div>
      </div>

      <div className={styles.facts}>
        {/* Строки курса у местного перевода нет вовсе: валюта одна, и пустая строка врала бы о работе. */}
        {!local && <FeedRow group="سعر الصرف" detail={`ثابت حتى ${TRANSFER.rateUntil}`} amount={<RateLock value={String(TRANSFER.rate)} />} />}
        <FeedRow group="الرسوم" detail={local ? 'بلا رسوم' : `بلا رسوم حتى ${money(TRANSFER.feeFreeUpTo)} درهم شهريًا`} amount="0" />
        <FeedRow group="الوصول" detail={local ? 'الآن' : 'اليوم'} amount={who.arrival} last />
      </div>

      <div className={styles.plate}>
        {/* Плашка плана есть только там, где есть резерв: у Юсуфа его нет (§4). */}
        {hasReserve && <div className={styles.execute}>
          <span className={styles.who}>
            <span className="ds-body-sm-medium">تنفيذ محجوز {TRANSFER.reserveDay} {MONTH.label} مبكرًا</span>
            <span className={`${styles.muted} ds-body-sm`}>
              {executePlan ? 'التحويل نفسه، فقط أبكر' : `محجوز ${TRANSFER.reserveDay} ${MONTH.label} يبقى كما هو`}
            </span>
          </span>
          <Toggle on={executePlan} onChange={setExecutePlan} label="تنفيذ المحجوز مبكرًا" />
        </div>}
        <div className={styles.result}>
          {insufficient ? (
            /* сумма больше доступного: то, чего не хватает, — глиной, в языке трёх состояний */
            <span className={styles.numbers}>
              <span className={`${styles.muted} ds-body-sm`}>ينقص</span>
              <Amount value={money(-freeAfter)} currency="درهم" size="md" tone="short" flow />
            </span>
          ) : (
            <span className={styles.numbers}>
              <span className={`${styles.muted} ds-body-sm`}>يبقى حرًا</span>
              <Amount value={money(freeAfter)} currency="درهم" size="md" tone="free" flow />
              <span className={`${styles.faint} ds-mono-xs`}>نصيب اليوم <FlowNumber value={share} /></span>
            </span>
          )}
          <span className={styles.grow} />
          <Orbit
            size="mini"
            days={MONTH.days}
            today={MONTH.today}
            spend={{}}
            obligations={marks.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
            past={PAST_EVENTS}
            dayFraction={MONTH.dayFraction}
          />
        </div>
      </div>

      <span className={styles.grow} />

      <div className={styles.confirm}>
        <SliderConfirm
          key={String(insufficient)}
          label="اسحب للإرسال"
          disabled={insufficient}
          onConfirm={() => go(executePlan ? '/screen/send-home-success' : '/screen/send-home-success/extra')}
        />
      </div>
    </div>
  )
}
