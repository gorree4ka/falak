import type { ComponentType } from 'react'
import { HomeBaseScreen } from './HomeBaseScreen'
import { HowCalculated } from './HowCalculated/HowCalculated'
import { SendHome } from './SendHome/SendHome'
import { SendHomeSuccess } from './SendHome/SendHomeSuccess'
import { HomeShort } from './HomeShort/HomeShort'
import { Obligation } from './Obligation/Obligation'
import { Legend } from './Legend/Legend'

/** Ключ файла Figma — тот же, что в `project.json`; ссылки в галерее ведут в кадры. */
export const FIGMA_FILE = '9PhUCqXUownqvFNyPyfB2f'

export interface ScreenState {
  /** Часть адреса: `/#/screen/<id>/<state>`. Латиница, без пробелов. */
  id: string
  label: string
}

export interface ScreenProps {
  /** Начальное состояние кадра. Экран остаётся живым — это только точка входа. */
  state?: string
}

export interface ScreenEntry {
  id: string
  name: string
  description: string
  /** Первое состояние — то, что открывается по адресу без состояния. */
  states: ScreenState[]
  figma: string
  component: ComponentType<ScreenProps>
}

/** Единый источник и для роутера, и для галереи, и для сканеров: плитки не хардкодятся. */
export const SCREENS: ScreenEntry[] = [
  {
    id: 'home',
    name: 'Главный экран',
    description: 'Остаток на сегодня в центре орбиты, месяц кольцом, шторка с резервом и людьми.',
    states: [
      { id: 'peek', label: 'Свёрнутая шторка' },
      { id: 'expanded', label: 'Раскрытая шторка' },
      { id: 'today', label: 'Сегодня' },
      { id: 'day', label: '18 сентября' },
      { id: 'day-open', label: '25 сентября · раскрыта' },
      { id: 'loading', label: 'Счёт ещё не пришёл' },
      { id: 'offline', label: 'Без связи' },
    ],
    figma: '28:3',
    component: HomeBaseScreen,
  },
  {
    id: 'how-calculated',
    name: 'Как посчитано',
    description: 'Формула построчно и тумблер на каждом обязательстве: расчёт отдан пользователю.',
    states: [
      { id: 'base', label: 'Всё в резерве' },
      { id: 'released', label: 'Гамея отпущена' },
    ],
    figma: '141:119',
    component: HowCalculated,
  },
  {
    id: 'legend',
    name: 'Первое открытие',
    description: 'Легенда кольца: что означают метки, засечки, дуга и сегмент суток. Показывается один раз.',
    states: [{ id: 'first', label: 'Легенда' }],
    figma: '28:3',
    component: Legend,
  },
  {
    id: 'obligation',
    name: 'Обязательство',
    description: 'Шторка одного платежа: перенести на неделю, пропустить в этом месяце, изменить сумму. Жёсткое — за подтверждением.',
    states: [
      { id: 'gamea', label: 'Гамея · подвижное' },
      { id: 'internet', label: 'Связь · жёсткое' },
      { id: 'subs', label: 'Подписки' },
      { id: 'mama', label: 'Маме · жёсткое' },
      { id: 'future', label: 'В «Будущее»' },
    ],
    figma: '559:1098',
    component: Obligation,
  },
  {
    id: 'send-home',
    name: 'Перевод маме',
    description: 'Сумма, курс и время прихода — и что перевод делает со свободными деньгами месяца.',
    states: [
      { id: 'mama', label: 'Маме · международный' },
      { id: 'yusuf', label: 'Юсуфу · местный' },
      { id: 'plan', label: 'Исполнить план' },
      { id: 'extra', label: 'Сверх плана' },
      { id: 'insufficient', label: 'Больше доступного' },
    ],
    figma: '369:329',
    component: SendHome,
  },
  {
    id: 'send-home-success',
    name: 'Отправлено',
    description: 'Подтверждение словом и числом: что ушло, когда придёт и сколько осталось свободным.',
    states: [
      { id: 'plan', label: 'План исполнен' },
      { id: 'extra', label: 'Сверх плана' },
    ],
    figma: '372:380',
    component: SendHomeSuccess,
  },
  {
    id: 'home-short',
    name: 'Нехватка',
    description: 'Зарплата не пришла: в центре размер дыры, а в шторке — список того, что можно отодвинуть.',
    states: [
      { id: 'base', label: 'Не хватает 1,640' },
      { id: 'covered', label: 'Оба пути выбраны' },
    ],
    figma: '245:235',
    component: HomeShort,
  },
]

export const HOME = SCREENS[0]

export const screenRoute = (id: string, state?: string) =>
  state ? `/screen/${id}/${state}` : `/screen/${id}`

export const figmaUrl = (node: string) =>
  `https://www.figma.com/design/${FIGMA_FILE}?node-id=${node.replace(':', '-')}`
