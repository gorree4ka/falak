import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Amount, Avatar, NoticeRow, Orbit, TabBar } from '../../components'
import type { TabKey } from '../../components'
import { OCTOBER, OCT_MOMENT, OCT_OBLIGATIONS, OCT_SPEND, OWNER, WAYS, money } from '../../data/fixture'
import { StatusBar } from '../parts/StatusBar'
import { go } from '../Router'
import type { ScreenProps } from '../registry'
import styles from './HomeShort.module.css'

/**
 * Screen/HomeShort — карта в ds/screens/home-short.md.
 *
 * Персона говорит прямо: «я и так знаю, что мне плохо». Значит предупреждение
 * бесполезно — нужен список того, что можно отодвинуть. Экран не сообщает о беде,
 * он показывает выход, и выход работает: выбранный путь пересчитывает число.
 */
export function HomeShort({ state = 'base' }: ScreenProps) {
  const [tab, setTab] = useState<TabKey>('today')
  /* Пути независимы: каждый считается сам по себе, складываются только выбранные (§9.1). */
  const [moved, setMoved] = useState<number[]>(state === 'covered' ? WAYS.map((w) => w.day) : [])

  const reserved = OCT_OBLIGATIONS.filter((o) => !moved.includes(o.day)).reduce((s, o) => s + o.amount, 0)
  const gap = reserved - OCTOBER.balance
  const covered = gap <= 0
  const free = -gap

  return (
    <div className={styles.screen}>
      <span className={styles.hazeTop} />
      <span className={styles.hazeBottom} />

      {/* Сценарный кадр: вечер того же дня, поэтому час свой, а не идущий (§2). */}
      <StatusBar time={OCT_MOMENT.now} />

      <div className={styles.header}>
        <Avatar size={34} name={OWNER.name} initial={OWNER.initial} photo={OWNER.photo} />
        <span className={styles.grow} />
      </div>

      <div className={styles.orbitZone}>
        <Orbit
          days={OCTOBER.days}
          today={OCTOBER.today}
          spend={OCT_SPEND}
          obligations={OCT_OBLIGATIONS.filter((o) => !moved.includes(o.day)).map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
          past={[]}
          dayFraction={OCT_MOMENT.dayFraction}
          tone={covered ? 'free' : 'short'}
          todayLabel="اليوم"
        >
          <span className={`${styles.muted} ds-body-sm`}>
            {covered ? 'يكفي لتغطية أكتوبر' : 'ناقص لتغطية أكتوبر'}
          </span>
          <span className={`${styles.marking} ds-marking`}>{covered ? 'COVERED' : 'SHORT BY'}</span>
          <Amount value={money(covered ? free : gap)} currency="درهم" size="hero" count tone={covered ? 'free' : 'short'} />
          <span className={`${styles.muted} ds-body-sm-medium`}>
            الراتب لم يصل · كان متوقعًا {OCTOBER.salaryExpected}
          </span>
        </Orbit>
      </div>

      <div className={styles.sheet}>
        <div className={styles.sheetHeader}>
          <span className="ds-heading-xl">مدار {OCTOBER.label}</span>
          <bdi className={`${styles.marking} ds-marking`}>{OCTOBER.days} DAYS</bdi>
          <span className={styles.grow} />
          <button type="button" className={styles.link} onClick={() => go('/screen/how-calculated')}>
            <span className="ds-body-sm-medium">كيف حُسب</span>
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className={styles.summary}>
          <span className={`${styles.muted} ds-body-sm`}>الالتزامات القادمة</span>
          <Amount value={money(reserved)} size="base" tone="reserved" />
          <span className={styles.grow} />
          <span className={`${styles.muted} ds-body-sm`}>{covered ? 'حر' : 'ناقص'}</span>
          <Amount value={money(covered ? free : gap)} size="base" tone={covered ? 'free' : 'short'} />
        </div>

        <div className={styles.context}>
          <NoticeRow
            state={covered ? 'free' : 'short'}
            marking={covered ? 'COVERED' : 'FIX'}
            headline={covered ? 'يكفي حتى وصول الراتب' : 'الراتب لم يصل — إليك ما يمكن تأجيله'}
            detail={covered ? undefined : 'الالتزامات الثابتة لا تُقترح للتأجيل'}
          />
        </div>

        <div className={styles.ways}>
          <div className={styles.waysHead}>
            <span className="ds-body-sm-medium">طرق التغطية</span>
            <span className={styles.rule} />
            <bdi className={`${styles.marking} ds-marking`}>WAYS TO COVER</bdi>
          </div>

          {WAYS.map((way) => {
            const on = moved.includes(way.day)
            /* Итог строки — независимый: что будет, если выбрать только её. */
            const alone = OCT_OBLIGATIONS.filter((o) => o.day !== way.day).reduce((s, o) => s + o.amount, 0) - OCTOBER.balance
            return (
              <button
                key={way.day}
                type="button"
                className={styles.way}
                aria-pressed={on}
                onClick={() => setMoved(on ? moved.filter((d) => d !== way.day) : [...moved, way.day])}
              >
                <span className={styles.wayText}>
                  <span className="ds-body-sm-medium">{way.title}</span>
                  {/* Пока путь не выбран — что будет, если выбрать только его. Выбранный говорит, что уже применён. */}
                  <span className={`${styles.faint} ds-body-sm`}>
                    {on
                      ? 'مُطبَّق · اضغط للتراجع'
                      : alone > 0 ? `يبقى ناقص ${money(alone)}` : `يكفي · يبقى حر ${money(-alone)}`}
                  </span>
                </span>
                <span className={styles.grow} />
                <Amount value={`+${money(way.frees)}`} size="base" tone={on ? 'free' : 'muted'} />
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.tabbar}>
        <TabBar active={tab} onChange={setTab} labels={{ more: 'المزيد', card: 'البطاقة', people: 'الناس', today: 'اليوم' }} />
      </div>
    </div>
  )
}
