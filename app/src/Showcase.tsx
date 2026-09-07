import { useState } from 'react'
import { go } from './screens/Router'
import { Toggle, ReserveRow, Button, Amount } from './components'
import type { TabKey } from './components'
import { HomeBase } from './screens/HomeBase'
import { Orbit } from './components'
import { EDGE_CASES, EDGE_SPEND, EDGE_PAST } from './data/edge-cases'
import { MONTH, MONEY, DAY, OBLIGATIONS, PAST_EVENTS, SPEND, SAVINGS, money } from './data/fixture'
import styles from './Showcase.module.css'

const SEMANTIC_GROUPS: [string, string[]][] = [
  ['Поверхности', ['surface-canvas', 'surface-raised', 'surface-pressed', 'surface-well', 'surface-inverse', 'surface-free', 'surface-reserved', 'surface-short']],
  ['Текст', ['text-primary', 'text-muted', 'text-faint', 'text-inverse', 'text-free', 'text-reserved', 'text-short']],
  ['Обводки', ['border-hairline', 'border-strong', 'border-free', 'border-short']],
  ['Состояния денег', ['money-free', 'money-reserved', 'money-short', 'money-past', 'money-free-graphic', 'money-reserved-graphic', 'money-short-graphic']],
  ['Орбита', ['orbit-track', 'orbit-engraving', 'orbit-numeral', 'orbit-remaining', 'orbit-today', 'orbit-mark', 'orbit-mark-past', 'orbit-arc-short']],
  ['Действие и свет', ['action-primary', 'action-primary-pressed', 'text-on-action', 'glow-core-free', 'glow-core-reserved']],
]

const TYPE_SCALE = [
  ['ds-display-amount-hero', '288'],
  ['ds-display-amount-xl', '6,840'],
  ['ds-display-amount-lg', '6,840'],
  ['ds-display-amount-md', '6,840'],
  ['ds-amount-lg', '4,120'],
  ['ds-amount-base', '1,200'],
  ['ds-heading-xl', 'مدار الشهر'],
  ['ds-body-lg', 'متاح للصرف اليوم'],
  ['ds-body-base', 'متاح للصرف اليوم'],
  ['ds-body-sm', 'حر حتى 1 أكتوبر'],
  ['ds-body-sm-medium', 'حر حتى 1 أكتوبر'],
  ['ds-label-xs', 'اليوم'],
  ['ds-mono-sm', '18 SEP'],
  ['ds-mono-xs', 'SAFE TO SPEND TODAY'],
]

export function Showcase() {
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const [tab, setTab] = useState<TabKey>('today')
  const [sheetView, setSheetView] = useState<'peek' | 'expanded'>('peek')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [held, setHeld] = useState<Record<number, boolean>>(
    Object.fromEntries(OBLIGATIONS.map((o) => [o.day, true])),
  )

  /* Снятие резерва пересчитывает число и убирает метку с кольца — как в шторке. */
  const activeObligations = OBLIGATIONS.filter((o) => held[o.day])
  const reserved = activeObligations.reduce((s, o) => s + o.amount, 0)
  const free = MONEY.balance - reserved
  const share = Math.round((free + DAY.spentSinceDawn) / MONTH.daysLeft)
  const remaining = share - DAY.spentSinceDawn

  return (
    <div className={styles.page} data-theme={theme === 'day' ? 'day' : undefined}>
      <header className={styles.head}>
        <div>
          <a className={`${styles.sub} ds-body-sm`} href="#/screens" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>← Все экраны</a>
          <h1 className="ds-heading-xl">Falak · React-база</h1>
          <p className={`${styles.sub} ds-body-sm`}>
            Зеркало дизайн-системы: токены и компоненты один в один с Figma. Числа — из <code>ia/demo-data.md</code>.
          </p>
        </div>
        <Button variant="quiet" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}>
          {theme === 'night' ? 'Ночь' : 'День'}
        </Button>
      </header>

      <section className={styles.section}>
        <h2 className={`${styles.h2} ds-body-sm-medium`}>Экран · главный</h2>
        <div className={styles.frames}>
          <HomeBase
            /* Витрина показывает вид: ссылка ведёт на собранный экран, как в приложении. */
            onHowCalculated={() => go('/screen/how-calculated')}
            obligations={activeObligations.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
            past={PAST_EVENTS}
            spend={SPEND}
            reserved={reserved}
            free={free}
            remaining={remaining}
            tab={tab}
            onTab={setTab}
            sheetView={sheetView}
            onSheetView={setSheetView}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          <div className={styles.panel}>
            <h3 className="ds-body-sm-medium">Как посчитано · живой расчёт</h3>
            <p className={`${styles.sub} ds-body-sm`}>
              Выключи любой пункт — число в центре пересчитается и метка уйдёт с кольца.
              В Figma это сказано словами, здесь работает.
            </p>
            <div className={styles.formula}>
              <FormulaRow label="الرصيد عند الفجر" value={money(MONEY.balance + DAY.spentSinceDawn)} />
              <FormulaRow label="المحجوز" value={`−${money(reserved)}`} tone="reserved" />
              <FormulaRow label={`حر حتى ${MONTH.nextSalary}`} value={money(free + DAY.spentSinceDawn)} rule />
              <FormulaRow label="يومًا حتى الراتب" value={`÷ ${MONTH.daysLeft}`} tone="faint" />
              <FormulaRow label={`نصيب اليوم · ثُبّت الفجر ${MONTH.fajr}`} value={money(share)} rule />
              <FormulaRow label="صرفت منذ الفجر" value={`−${DAY.spentSinceDawn}`} tone="reserved" />
              <FormulaRow label="متاح للصرف اليوم" value={money(remaining)} rule big />
            </div>
            <div className={styles.list}>
              {OBLIGATIONS.map((o) => (
                <ReserveRow
                  key={o.day}
                  title={o.title}
                  date={o.date}
                  amount={money(o.amount)}
                  weight={o.weight}
                  held={held[o.day]}
                  onToggle={(next) => setHeld({ ...held, [o.day]: next })}
                />
              ))}
              <p className={`${styles.faint} ds-body-sm`}>
                مدّخرات «المستقبل» {money(SAVINGS)} · حساب منفصل، خارج الرصيد
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.h2} ds-body-sm-medium`}>Совпадения на кольце · проверка</h2>
        <p className={`${styles.sub} ds-body-sm`}>
          В фикстуре совпадений нет — поэтому оба случая и не ловились. Здесь они собраны нарочно.
          Данные проверочные, в экраны не попадают.
        </p>
        <div className={styles.cases}>
          {EDGE_CASES.map((c) => (
            <div key={c.id} className={styles.case}>
              <div className={styles.caseRing}>
                <Orbit
                  days={c.days}
                  today={c.today}
                  spend={EDGE_SPEND}
                  obligations={c.obligations}
                  past={EDGE_PAST}
                  dayFraction={0.187}
                />
              </div>
              <span className="ds-body-sm-medium">{c.title}</span>
              <span className={`${styles.sub} ds-body-sm`}>{c.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.h2} ds-body-sm-medium`}>Смысловые токены · {SEMANTIC_GROUPS.reduce((s, g) => s + g[1].length, 0)} ролей × 2 режима</h2>
        {SEMANTIC_GROUPS.map(([title, names]) => (
          <div key={title} className={styles.group}>
            <span className={`${styles.groupName} ds-mono-xs`}>{title}</span>
            <div className={styles.swatches}>
              {names.map((n) => (
                <div key={n} className={styles.swatch}>
                  <span className={styles.chipColor} style={{ background: `var(--${n})` }} />
                  <span className={`${styles.swatchName} ds-mono-xs`}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.h2} ds-body-sm-medium`}>Шкала текста · 14 стилей</h2>
        <div className={styles.type}>
          {TYPE_SCALE.map(([cls, sample]) => (
            <div key={cls} className={styles.typeRow}>
              <span className={`${styles.swatchName} ds-mono-xs`}>{cls}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.h2} ds-body-sm-medium`}>Компоненты</h2>
        <div className={styles.kit}>
          <div className={styles.kitItem}>
            <span className={`${styles.swatchName} ds-mono-xs`}>Toggle</span>
            <div className={styles.kitRow}><Toggle on onChange={() => {}} /><Toggle on={false} onChange={() => {}} /></div>
          </div>
          <div className={styles.kitItem}>
            <span className={`${styles.swatchName} ds-mono-xs`}>Amount</span>
            <div className={styles.kitRow}>
              <Amount value="6,840" tone="free" size="lg" />
              <Amount value="4,120" tone="reserved" size="base" />
              <Amount value="1,200" tone="short" size="base" />
            </div>
          </div>
          <div className={styles.kitItem}>
            <span className={`${styles.swatchName} ds-mono-xs`}>Button</span>
            {/* Витрина показывает вид, а не поведение: обработчик здесь пустой намеренно,
               иначе кнопка кита выглядит нажимаемой и никуда не ведёт (`inert_controls`). */}
            <div className={styles.kitRow}>
              <Button onClick={() => undefined}>تأكيد</Button>
              <Button variant="quiet" onClick={() => undefined}>إلغاء</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function FormulaRow({ label, value, tone = 'primary', rule = false, big = false }: {
  label: string; value: string; tone?: 'primary' | 'reserved' | 'faint'; rule?: boolean; big?: boolean
}) {
  return (
    <div className={styles.fRow} data-rule={rule}>
      <span className={`${big ? 'ds-amount-lg' : 'ds-amount-base'} ${styles[big ? 'free' : tone]}`}>{value}</span>
      <span className={styles.grow} />
      <span className={big ? 'ds-body-sm-medium' : 'ds-body-sm'}>{label}</span>
    </div>
  )
}
