import { useLayoutEffect, useRef, useState } from 'react'
import { Battery, Wifi, Bell, ChevronLeft } from 'lucide-react'
import {
  Orbit, Avatar, PersonChip, AddPersonChip, FeedRow, TabBar, Amount, NoticeRow,
} from '../components'
import type { TabKey, Obligation } from '../components'
import { MONTH, MONEY, DAY, DATA, OWNER, PEOPLE, FEED, OBLIGATIONS, TODAY_TRANSACTIONS, money } from '../data/fixture'
import { useDemoClock } from '../clock'
import { swipedPast } from '../motion'
import styles from './HomeBase.module.css'

export interface HomeBaseProps {
  obligations: Obligation[]
  past: number[]
  spend: Record<number, number>
  reserved: number
  free: number
  remaining: number
  tab: TabKey
  onTab: (t: TabKey) => void
  /** Ссылка «كيف حُسب» обязана вести: необязательный обработчик однажды уже оставил её мёртвой (№102, №114). */
  onHowCalculated: () => void
  /** Чип человека — вход в перевод: главное действие продукта за одно касание с главного. */
  onPerson?: (name: string) => void
  /** Шторка живёт в двух ростах: сжатом со сводкой и раскрытом с прокруткой. */
  sheetView?: 'peek' | 'expanded'
  onSheetView?: (v: 'peek' | 'expanded') => void
  /** Выбранный на кольце день: шторка показывает его состав. */
  selectedDay?: number | null
  onSelectDay?: (d: number | null) => void
  /** Строка обязательства открывает его шторку: перенести, пропустить, изменить. */
  onObligation?: (day: number) => void
  /** Состояние данных, а не денег: `loading` — счёт ещё не пришёл, `offline` — ответ был в 14:20 (§12). */
  data?: 'ready' | 'loading' | 'offline'
}

/**
 * Screen/HomeBase — карта в ds/screens/home.md.
 *
 * Порядок в разметке — порядок чтения: первый ребёнок флекса в RTL уходит
 * к правому краю. В Figma порядок обратный, потому что там направления нет
 * и его разворачивают руками; повторять этот разворот в коде значит развернуть дважды.
 */
export function HomeBase({
  obligations, past, spend, reserved, free, remaining,
  tab, onTab, onHowCalculated, onPerson, sheetView = 'peek', onSheetView,
  selectedDay = null, onSelectDay, onObligation, data = 'ready',
}: HomeBaseProps) {
  /* Часы идут: системная строка и сегмент суток берут одно и то же «сейчас». */
  const clock = useDemoClock()
  const loading = data === 'loading'
  const offline = data === 'offline'
  const handlePointer = useRef<{ id: number; x: number; y: number; at: number; threshold: number } | null>(null)
  const handledSwipe = useRef(false)
  const expanded = sheetView === 'expanded'
  const isDayView = selectedDay != null
  const isToday = selectedDay === MONTH.today
  const sheetToggleLabel = expanded ? 'إخفاء التفاصيل' : selectedDay == null ? 'تفاصيل الشهر' : 'تفاصيل اليوم'
  const dayItems = obligations.filter((o) => o.day === selectedDay)
  /* Свободные после дня: из свободных вычитается всё, что зарезервировано по этот день включительно. */
  const freeAfterDay = (day: number) =>
    free - obligations.filter((o) => o.day <= day).reduce((s, o) => s + o.amount, 0)
  const daySpent = selectedDay != null ? spend[selectedDay] : undefined
  const nextObligation = [...obligations]
    .filter((o) => o.day >= MONTH.today)
    .sort((a, b) => a.day - b.day)[0]
  return (
    /* Вид задаёт рост раскрытой шторки: у месяца лента, у дня — состав одного дня,
       у сегодня к нему добавляются операции с рассвета и расчёт (см. модуль стилей). */
    <div
      className={styles.screen}
      data-sheet={sheetView}
      data-view={!isDayView ? 'month' : isToday ? 'today' : 'day'}
      /* Плашка состояния данных — целый блок сверху: с ней у дня столько же
         содержания, сколько у месяца, и короткий рост увёл бы расчёт под прокрутку. */
      data-notice={offline ? 'stale' : undefined}
    >
      <span className={styles.hazeTop} />
      <span className={styles.hazeBottom} />

      <div className={styles.statusbar}>
        <bdi className="ds-mono-sm">{clock.time}</bdi>
        <span className={styles.grow} />
        <span className={styles.indicators}>
          <span className={styles.cellular}>
            <i style={{ height: 3.5, opacity: .35 }} /><i style={{ height: 6 }} />
            <i style={{ height: 8.5 }} /><i style={{ height: 11 }} />
          </span>
          <Wifi size={16} strokeWidth={2.25} />
          <Battery size={18} strokeWidth={2} />
        </span>
      </div>

      <div className={styles.header}>
        <Avatar size={34} name={OWNER.name} initial={OWNER.initial} photo={OWNER.photo} />
        <span className={styles.grow} />
        <Bell size={18} strokeWidth={2} className={styles.bell} />
      </div>

      <div className={styles.orbitZone}>
        <Orbit
          days={MONTH.days}
          today={MONTH.today}
          /* Загрузка: прибор на месте, показаний нет — ни длины засечек, ни меток, ни подписи дня. */
          spend={loading ? {} : spend}
          obligations={loading ? [] : obligations}
          past={loading ? [] : past}
          dayFraction={clock.dayFraction}
          seconds
          todayLabel={loading ? undefined : 'اليوم'}
          selectedDay={selectedDay}
          onSelectDay={loading ? undefined : onSelectDay}
        >
          <span className={`${styles.muted} ds-body-sm`}>متاح للصرف اليوم</span>
          <span className={`${styles.marking} ds-marking`}>SAFE TO SPEND TODAY</span>
          {loading
            ? <span className={styles.skeletonHero} aria-label="جارٍ التحديث" />
            : <Amount value={money(remaining)} currency="درهم" size="hero" count />}
          <span className={`${styles.muted} ds-body-sm-medium`}>
            {MONTH.weekday} {MONTH.today} {MONTH.label} · {MONTH.hijri}
          </span>
          {/* Число дня — доля от нормы, а не одинокая сумма: «76» само по себе ничего не говорит (№110). */}
          <span className={`${styles.faint} ds-body-sm`}>
            {/* Строка прибора говорит о деньгах и остаётся верной без связи:
                состояние данных несёт плашка выше, а не показание. */}
            {loading ? 'جارٍ التحديث…' : `صرفت ${DAY.spentSinceDawn} من ${DAY.share} · يتجدّد كل فجر`}
          </span>
          <span className={`${styles.muted} ds-body-sm`}>
            متبقّي الشهر · {MONTH.daysLeft} يومًا
          </span>
        </Orbit>
      </div>

      <div className={styles.sheet}>
        <button
          type="button"
          className={styles.sheetHandle}
          aria-expanded={expanded}
          aria-label={sheetToggleLabel}
          title={sheetToggleLabel}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return
            handledSwipe.current = false
            handlePointer.current = {
              id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(),
              threshold: parseFloat(getComputedStyle(event.currentTarget).getPropertyValue('--space-6')),
            }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={(event) => {
            const start = handlePointer.current
            if (!start || start.id !== event.pointerId) return
            handlePointer.current = null
            const dx = event.clientX - start.x
            const dy = event.clientY - start.y
            /* Мах вверх раскрывает, вниз сворачивает — даже если пальцем прошли всего ничего. */
            const swipe = Math.abs(dy) > Math.abs(dx)
              && swipedPast(dy, performance.now() - start.at, start.threshold)
            /* Клик после жеста не должен переключить рост второй раз. */
            handledSwipe.current = swipe || Math.max(Math.abs(dx), Math.abs(dy)) >= start.threshold
            if (swipe) onSheetView?.(dy < 0 ? 'expanded' : 'peek')
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => { handlePointer.current = null }}
          onLostPointerCapture={() => { handlePointer.current = null }}
          onClick={(event) => {
            if (event.detail !== 0 && handledSwipe.current) {
              handledSwipe.current = false
              return
            }
            onSheetView?.(expanded ? 'peek' : 'expanded')
          }}
        >
          <span aria-hidden="true" />
        </button>
        <div className={styles.sheetHeader}>
          <div className={styles.sheetTitle}>
            <span className="ds-heading-xl">{isDayView ? 'تفاصيل اليوم' : 'مدار الشهر'}</span>
            {!isDayView && (
              <bdi className={`${styles.marking} ds-marking`}>{MONTH.days} DAYS</bdi>
            )}
          </div>
          {/* Сегмент говорит, про что шторка: «сегодня» — пока выбран сегодняшний день,
              дата — когда на кольце выбран другой. Иначе «сегодня» горит над 18 сентября. */}
          <PeriodSwitch
            dayLabel={isDayView && !isToday ? `${selectedDay} ${MONTH.label}` : 'اليوم'}
            monthLabel="الشهر"
            dayOn={isDayView}
            onDay={() => onSelectDay?.(selectedDay ?? MONTH.today)}
            onMonth={() => onSelectDay?.(null)}
          />
        </div>

        {/* Плашка данных стоит над сводкой и видна в обоих ростах: она про весь экран,
            а не про содержимое раскрытой панели. */}
        {offline && (
          <div className={styles.dataNotice}>
            <NoticeRow
              state="stale"
              marking="OFFLINE"
              headline={`البيانات حتى ${DATA.lastSeen}`}
              detail="الأرقام صحيحة حتى ذلك الوقت · قد تكون هناك مصروفات بعده"
            />
          </div>
        )}

        {/* Сводка видна всегда: сжатая шторка обязана отвечать на вопрос, а не только намекать. */}
        <div className={styles.summary}>
          <Sum label="محجوز" value={money(reserved)} tone="reserved" loading={loading} />
          <Sum label={`حر حتى ${MONTH.nextSalary}`} value={money(free)} tone="free" loading={loading} />
          <Sum label="في الحساب" value={money(MONEY.balance)} tone="muted" loading={loading} />
        </div>

        <div className={styles.sectionHeading}>
          <span className="ds-body-sm-medium">
            {/* Дата показывается один раз — в сегменте; здесь ряд назван так же, как месячный: «этот день» / «этот месяц». */}
            {selectedDay != null ? 'هذا اليوم' : expanded ? 'هذا الشهر' : 'الالتزام القادم'}
          </span>
          <button type="button" className={styles.link} onClick={() => onHowCalculated()}>
            <span className="ds-body-sm-medium">كيف حُسب</span>
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
        </div>

        {!expanded && selectedDay == null && (
          <div className={styles.peekContext}>
            {nextObligation ? (
              <button
                type="button"
                className={styles.nextPayment}
                onClick={() => onSelectDay?.(nextObligation.day)}
              >
                <span className={nextObligation.weight === 'hard' ? styles.markHard : styles.markSoft} />
                <span className={styles.nextText}>
                  <span className="ds-body-sm-medium">
                    {OBLIGATIONS.find((o) => o.day === nextObligation.day)?.title ?? `${nextObligation.day} ${MONTH.label}`}
                  </span>
                  <span className={`${styles.muted} ds-body-sm`}>
                    {nextObligation.day} {MONTH.label}
                  </span>
                </span>
                <Amount value={money(nextObligation.amount)} currency="درهم" size="base" tone="reserved" />
                <ChevronLeft size={20} strokeWidth={1.8} className={styles.muted} />
              </button>
            ) : (
              <div className={styles.nextEmpty}>
                <span className="ds-body-sm-medium">لا توجد مبالغ محجوزة</span>
                <span className={`${styles.muted} ds-body-sm`}>ستظهر هنا أقرب دفعة عند حجز مبلغ لها</span>
              </div>
            )}
          </div>
        )}

        {selectedDay != null ? (
          <div key={selectedDay} className={styles.day}>
            {dayItems.map((o, i) => (
                <div key={`${o.day}-${i}`} className={`${styles.dayRow} ${onObligation ? styles.dayRowLink : ''}`}
                  role={onObligation ? 'button' : undefined} tabIndex={onObligation ? 0 : undefined}
                  onClick={onObligation ? () => onObligation(o.day) : undefined}
                  onKeyDown={onObligation ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onObligation(o.day) } } : undefined}>
                  <span className={o.weight === 'hard' ? styles.markHard : styles.markSoft} />
                  <span className="ds-body-sm-medium">
                    {OBLIGATIONS.find((item) => item.day === o.day && item.amount === o.amount && item.weight === o.weight)?.title ?? 'مبلغ محجوز'}
                  </span>
                  <span className={styles.grow} />
                  <Amount value={money(o.amount)} currency="درهم" tone="reserved" size="base" />
                </div>
            ))}
            {/* Потраченное живёт в одном месте: в раскрытом дне его несёт расчёт ниже, здесь — нет (№139). */}
            {daySpent != null && !(expanded && isToday) && (
              <div className={styles.dayRow}>
                <span className={`${styles.muted} ds-body-sm`}>
                  {isToday ? 'صرفت اليوم منذ الفجر' : 'صرفت في هذا اليوم'}
                </span>
                <span className={styles.grow} />
                <Amount value={money(daySpent)} currency="درهم" size="base" />
              </div>
            )}
            {isToday && (expanded ? (
              <div className={styles.dayTransactions}>
                {TODAY_TRANSACTIONS.map((transaction, i) => (
                  <FeedRow key={transaction.title} group={transaction.title} detail=""
                    amount={money(transaction.amount)} last={i === TODAY_TRANSACTIONS.length - 1} />
                ))}
              </div>
            ) : (
              <span className={`${styles.muted} ds-body-sm`}>
                {TODAY_TRANSACTIONS.map((transaction) => transaction.title).join(' · ')}
              </span>
            ))}
            {/*
              Раскрытый день несёт то, чего нет в свёрнутой шторке. Для сегодня —
              откуда взялось число в центре: норма дня, потраченное, остаток.
              Для любого другого дня — что этот день делает с месяцем.
              Оба блока считаются из фикстуры, ни одного нового значения (№139).
            */}
            {expanded && isToday && (
              <div className={styles.dayMath}>
                <div className={styles.dayRow}>
                  <span className={`${styles.muted} ds-body-sm`}>نصيب اليوم · ثُبّت الفجر {MONTH.fajr}</span>
                  <span className={styles.grow} />
                  <Amount value={money(DAY.share)} size="base" />
                </div>
                <div className={styles.dayRow}>
                  <span className={`${styles.muted} ds-body-sm`}>صرفت منذ الفجر</span>
                  <span className={styles.grow} />
                  <Amount value={`−${money(DAY.spentSinceDawn)}`} size="base" tone="reserved" />
                </div>
                <div className={`${styles.dayRow} ${styles.dayTotal}`}>
                  <span className="ds-body-sm-medium">متاح للصرف اليوم</span>
                  <span className={styles.grow} />
                  <Amount value={money(remaining)} currency="درهم" size="base" tone="free" />
                </div>
              </div>
            )}

            {expanded && !isToday && selectedDay != null && (
              <div className={styles.dayMath}>
                <div className={styles.dayRow}>
                  <span className={`${styles.muted} ds-body-sm`}>يبقى حرًا بعد هذا اليوم</span>
                  <span className={styles.grow} />
                  <Amount value={money(freeAfterDay(selectedDay))} currency="درهم" size="base" tone="free" />
                </div>
                <div className={styles.dayRow}>
                  <span className={`${styles.muted} ds-body-sm`}>
                    اليوم {selectedDay} من {MONTH.days} · حتى الراتب {daysWord(MONTH.days - selectedDay + 1)}
                  </span>
                </div>
              </div>
            )}

            {dayItems.length === 0 && daySpent == null && (
              <div className={styles.dayRow}>
                <span className={`${styles.faint} ds-body-sm`}>لا شيء محجوز في هذا اليوم</span>
              </div>
            )}

            {dayItems.length > 1 && (
              <span className={`${styles.faint} ds-body-sm`}>
                {dayItems.length} التزامات في يوم واحد · على المدار علامة واحدة
              </span>
            )}
          </div>
        ) : (
        <div key="month" className={styles.details}>
        <div className={styles.context}>
          <NoticeRow
            state="free"
            marking="COVERED"
            headline={`الالتزامات المؤكدة مغطاة حتى ${MONTH.nextSalary}`}
            detail={obligations.length ? `الأقرب: ${nearest(obligations)}` : undefined}
          />
        </div>

        <div className={styles.people}>
          {PEOPLE.map((p) => <PersonChip key={p.name} {...p} onClick={() => onPerson?.(p.name)} />)}
          <AddPersonChip label="إضافة" />
        </div>

        <div className={styles.feed}>
          {FEED.map((f, i) => <FeedRow key={f.group} {...f} last={i === FEED.length - 1} />)}
        </div>
        </div>
        )}
      </div>

      <div className={styles.tabbar}>
        <TabBar
          active={tab}
          onChange={onTab}
          labels={{ more: 'المزيد', card: 'البطاقة', people: 'الناس', today: 'اليوم' }}
        />
      </div>
    </div>
  )
}

/**
 * Переключатель периода: два сегмента и плашка, которая **едет**, а не
 * перекрашивается. Её можно тянуть пальцем и отпустить — она встанет к
 * ближайшему сегменту (№161). Тап и клавиатура работают как прежде: выбор
 * несут сами кнопки, жест только помогает.
 */
function PeriodSwitch({ dayLabel, monthLabel, dayOn, onDay, onMonth }: {
  dayLabel: string; monthLabel: string; dayOn: boolean; onDay: () => void; onMonth: () => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const dayRef = useRef<HTMLButtonElement>(null)
  const monthRef = useRef<HTMLButtonElement>(null)
  type Box = { start: number; width: number }
  const [anchors, setAnchors] = useState<{ day: Box; month: Box; rtl: boolean } | null>(null)
  const [dragAt, setDragAt] = useState<number | null>(null)
  const gesture = useRef<{ id: number; x: number; from: number; moved: boolean } | null>(null)
  const dragged = useRef(false)

  /*
    Плашка повторяет коробку активного сегмента, а сегмент растёт под дату —
    поэтому положение и ширина замеряются, а не берутся из констант. Смещение
    считается от **начала строки**: в RTL это правый край, и физический сдвиг
    идёт в минус. Так плашка одинаково работает в обеих локалях.
  */
  useLayoutEffect(() => {
    const measure = () => {
      const t = track.current, d = dayRef.current?.firstElementChild, m = monthRef.current?.firstElementChild
      if (!t || !d || !m) return
      const rtl = getComputedStyle(t).direction === 'rtl'
      const tr = t.getBoundingClientRect()
      const box = (el: Element): Box => {
        const r = el.getBoundingClientRect()
        return { start: rtl ? tr.right - r.right : r.left - tr.left, width: r.width }
      }
      setAnchors({ day: box(d), month: box(m), rtl })
    }
    measure()
    /* Ширина сегмента зависит от шрифта: до его загрузки замер врёт на несколько пунктов. */
    document.fonts?.ready.then(measure).catch(() => {})
  }, [dayLabel, monthLabel])

  const active = anchors ? (dayOn ? anchors.day : anchors.month) : null
  const at = dragAt ?? active?.start ?? 0
  const sign = anchors?.rtl ? -1 : 1

  const finish = (event: React.PointerEvent, commit: boolean) => {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragged.current = g.moved
    if (commit && g.moved && anchors) {
      const pos = clampStart(g.from + sign * (event.clientX - g.x), anchors)
      const toDay = Math.abs(pos - anchors.day.start) <= Math.abs(pos - anchors.month.start)
      if (toDay !== dayOn) (toDay ? onDay : onMonth)()
    }
    setDragAt(null)
  }

  return (
    <div
      ref={track}
      className={`${styles.switch} ${styles.switchTrack}`}
      role="group"
      aria-label="فترة العرض"
      data-thumb={anchors ? 'on' : 'off'}
      onPointerDown={(event) => {
        /* Второй палец не перехватывает начатый жест: иначе плашка прыгает к нему. */
        if (!event.isPrimary || event.button !== 0 || !active || gesture.current) return
        dragged.current = false
        gesture.current = { id: event.pointerId, x: event.clientX, from: active.start, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const g = gesture.current
        if (!g || g.id !== event.pointerId || !anchors) return
        const shift = sign * (event.clientX - g.x)
        /* Дрожание пальца — не перетаскивание: до порога это по-прежнему тап. */
        if (!g.moved && Math.abs(shift) < 3) return
        g.moved = true
        setDragAt(clampStart(g.from + shift, anchors))
      }}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      /* После перетаскивания браузер шлёт клик по кнопке под пальцем — он выбрал бы дважды. */
      onClickCapture={(event) => {
        /* У нажатия с клавиатуры `detail` равен нулю — его гасить нельзя. */
        if (!dragged.current || event.detail === 0) return
        dragged.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {/* Слой появляется уже на своём месте — иначе первый кадр ехал бы от края. */}
      {active && (
        <span
          className={`${styles.thumb} ${dragAt != null ? styles.thumbDrag : ''}`}
          aria-hidden="true"
          style={{ transform: `translateX(${sign * at}px)`, inlineSize: `${active.width}px` }}
        />
      )}
      {/* Пропы объявлены без аргументов — зовём без аргументов: событие в них не течёт. */}
      <button
        ref={dayRef}
        type="button"
        className={`${dayOn ? styles.segOn : styles.seg} ds-body-sm-medium`}
        aria-pressed={dayOn}
        onClick={() => onDay()}
      ><span>{dayLabel}</span></button>
      <button
        ref={monthRef}
        type="button"
        className={`${dayOn ? styles.seg : styles.segOn} ds-body-sm-medium`}
        aria-pressed={!dayOn}
        onClick={() => onMonth()}
      ><span>{monthLabel}</span></button>
    </div>
  )
}

/**
 * У плашки два места, и дальше них она не уходит — но упирается не в стену:
 * за границей палец продолжает её тянуть, а она поддаётся всё меньше. Жёсткий
 * упор читается как поломка, трение — как край.
 */
function clampStart(value: number, a: { day: { start: number }; month: { start: number } }) {
  const lo = Math.min(a.day.start, a.month.start)
  const hi = Math.max(a.day.start, a.month.start)
  if (value < lo) return lo - friction(lo - value)
  if (value > hi) return hi + friction(value - hi)
  return value
}

/** Сопротивление за краем: треть хода и не больше 12 px. */
function friction(over: number) {
  return Math.min(over * 0.3, 12)
}

/** Счёт дней по-арабски: от 3 до 10 — ломаное множественное «أيام», иначе «يومًا». */
function daysWord(n: number) {
  return n >= 3 && n <= 10 ? `${n} أيام` : `${n} يومًا`
}

/** Ближайшее обязательство называется поимённо — на кольце его метка без подписи. */
function nearest(list: Obligation[]) {
  const next = [...list].sort((a, b) => a.day - b.day)[0]
  const named: Record<number, string> = {
    18: 'الجمعية', 20: 'الاتصالات', 22: 'الاشتراكات', 25: 'ماما', 28: 'المستقبل',
  }
  return `${named[next.day] ?? ''} · ${next.day} ${MONTH.label} · ${money(next.amount)} درهم`
}


/** Колонка сводки: подпись сверху, число снизу — в сжатом росте читается за раз. */
function Sum({ label, value, tone, loading = false }: {
  label: string; value: string; tone: 'reserved' | 'free' | 'muted'; loading?: boolean
}) {
  return (
    <span className={styles.sum}>
      <span className={styles.sumLabel}>
        <span className={`${styles.dot} ${styles[tone]}`} />
        <span className="ds-body-sm">{label}</span>
      </span>
      {loading
        ? <span className={styles.skeletonValue} aria-hidden="true" />
        : <Amount value={value} size="lg" tone={tone === 'muted' ? 'muted' : tone} />}
    </span>
  )
}
