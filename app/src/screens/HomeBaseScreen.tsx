import { useState } from 'react'
import { HomeBase } from './HomeBase'
import { go } from './Router'
import { stateOfDay } from './Obligation/Obligation'
import type { ScreenProps } from './registry'
import type { TabKey } from '../components'
import { OBLIGATIONS, PAST_EVENTS, SPEND, MONEY, DAY, MONTH, TRANSFER } from '../data/fixture'

/**
 * Обёртка главного экрана: держит состояние, сам экран остаётся статичным.
 *
 * Состояние из адреса — только точка входа: `expanded` раскрывает шторку,
 * `today` и `day` выбирают день на кольце. Дальше экран живёт сам.
 */
const DATA_STATE: Record<string, 'loading' | 'offline'> = { loading: 'loading', offline: 'offline' }

export function HomeBaseScreen({ state = 'peek' }: ScreenProps) {
  const [tab, setTab] = useState<TabKey>('today')
  const [sheetView, setSheetView] = useState<'peek' | 'expanded'>(
    state === 'expanded' || state === 'day-open' ? 'expanded' : 'peek',
  )
  const [selectedDay, setSelectedDay] = useState<number | null>(
    state === 'today' ? MONTH.today
      : state === 'day' ? nextObligationDay()
      /* 25-е — день резерва маме: его метка на кольце видна над кромкой раскрытой шторки,
         поэтому подсветка выбранного дня в этом состоянии читается (кадр `Screen/HomeBase · Day=25`). */
      : state === 'day-open' ? TRANSFER.reserveDay
      : null,
  )

  const reserved = OBLIGATIONS.reduce((s, o) => s + o.amount, 0)
  const free = MONEY.balance - reserved
  const share = Math.round((free + DAY.spentSinceDawn) / MONTH.daysLeft)

  return (
    <HomeBase
      obligations={OBLIGATIONS.map((o) => ({ day: o.day, amount: o.amount, weight: o.weight }))}
      past={PAST_EVENTS}
      spend={SPEND}
      reserved={reserved}
      free={free}
      remaining={share - DAY.spentSinceDawn}
      tab={tab}
      onTab={setTab}
      /* Ссылка «كيف حُسب» ведёт на собранный экран расчёта: в карте экрана
         этот переход описан, и без обработчика он оставался обещанием. */
      onHowCalculated={() => go('/screen/how-calculated')}
      /* Перевод собран для мамы — единственного получателя с резервом; остальные чипы пока ведут туда же. */
      onPerson={() => go('/screen/send-home')}
      sheetView={sheetView}
      onSheetView={setSheetView}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      onObligation={(day) => go(`/screen/obligation/${stateOfDay(day)}`)}
      data={DATA_STATE[state] ?? 'ready'}
    />
  )
}

/** Состояние «выбранный день» показывает ближайшее обязательство — там есть что читать. */
function nextObligationDay() {
  return [...OBLIGATIONS].filter((o) => o.day >= MONTH.today).sort((a, b) => a.day - b.day)[0]?.day ?? MONTH.today
}
