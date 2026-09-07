/**
 * Проверочные наборы, а не продуктовые данные.
 *
 * Фикстура описывает сентябрь и октябрь, и совпадений в них нет — именно поэтому
 * оба случая и не ловились. Здесь они собраны нарочно, чтобы правило можно было
 * увидеть, а не прочитать. В экраны эти данные не попадают.
 */
import { SPEND, PAST_EVENTS } from './fixture'

export type EdgeCase = {
  id: string
  title: string
  note: string
  today: number
  days: number
  obligations: { day: number; amount: number; weight: 'hard' | 'soft' }[]
}

const BASE = [
  { day: 18, amount: 500,   weight: 'soft' as const },
  { day: 20, amount: 280,   weight: 'hard' as const },
  { day: 25, amount: 1_200, weight: 'hard' as const },
]

export const EDGE_CASES: EdgeCase[] = [
  {
    id: 'single',
    title: 'Обычный день',
    note: 'Одно обязательство — точка. Залито жёсткое, контур подвижное.',
    today: 12, days: 30, obligations: BASE,
  },
  {
    id: 'collision',
    title: 'Два платежа в один день',
    note: 'Одна метка на день, но сегментом: «здесь не одно». Залито, потому что одно из двух жёсткое.',
    today: 12, days: 30,
    obligations: [...BASE, { day: 20, amount: 140, weight: 'soft' as const }],
  },
  {
    id: 'many',
    title: 'Четыре платежа в один день',
    note: 'Сегмент той же длины: кольцо не считает. Соседние дни отстоят на 31 px, растущий сегмент упёрся бы в соседа уже на четвёртом.',
    today: 12, days: 30,
    obligations: [
      ...BASE,
      { day: 25, amount: 140, weight: 'soft' as const },
      { day: 25, amount: 90,  weight: 'soft' as const },
      { day: 25, amount: 60,  weight: 'soft' as const },
    ],
  },
  {
    id: 'neighbours',
    title: 'Тяжёлые дни подряд',
    note: 'Два соседних дня с несколькими платежами: просвет 13 px, сегменты не сливаются.',
    today: 12, days: 31,
    obligations: [
      { day: 20, amount: 280,   weight: 'hard' as const },
      { day: 20, amount: 140,   weight: 'soft' as const },
      { day: 21, amount: 1_200, weight: 'hard' as const },
      { day: 21, amount: 500,   weight: 'soft' as const },
    ],
  },
  {
    id: 'today-hard',
    title: 'Сегодня совпало с жёстким платежом',
    note: 'Один составной глиф: светящаяся точка внутри, сплошное латунное кольцо снаружи.',
    today: 20, days: 30, obligations: BASE,
  },
  {
    id: 'today-soft',
    title: 'Сегодня совпало с подвижным',
    note: 'То же кольцо, но пунктирное — этот платёж можно перенести.',
    today: 18, days: 30, obligations: BASE,
  },
]

export const EDGE_SPEND = SPEND
export const EDGE_PAST = PAST_EVENTS
