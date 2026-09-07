/**
 * Демо-данные. Единственный источник — ia/demo-data.md.
 * Числа здесь не придумываются: нет в фикстуре — сначала правится фикстура.
 */

export const MONTH = {
  days: 30,
  today: 12,
  label: 'سبتمبر',
  year: 2026,
  weekday: 'السبت',
  hijri: '20 ربيع الأول',
  nextSalary: '1 أكتوبر',
  daysLeft: 19,
  fajr: '5:12',
  now: '9:41',
  /** Прожито от фаджра: 4 ч 29 мин из 24. */
  dayFraction: 0.187,
}

/** §3 — деньги на опорную дату. */
export const MONEY = {
  balance: 10_960,
  reserved: 4_120,
  free: 6_840,
}

/** §3.1 — норма дня и её расход. */
export const DAY = {
  balanceAtDawn: 11_036,
  freeAtDawn: 6_916,
  share: 364,
  spentSinceDawn: 76,
  remaining: 288,
}

/** §3.1 — операции с сегодняшнего рассвета: 54 + 22 = 76 AED. */
export const TODAY_TRANSACTIONS = [
  { title: 'كريم', amount: 54 },
  { title: 'قهوة', amount: 22 },
]

/** §4 — состав резерва. */
export const OBLIGATIONS = [
  { day: 18, title: 'الجمعية — اشتراكي', date: '18 سبتمبر', amount: 500,   weight: 'soft' as const },
  { day: 20, title: 'الاتصال والإنترنت', date: '20 سبتمبر', amount: 280,   weight: 'hard' as const, reason: 'الاتصال سيُقطع' },
  { day: 22, title: 'الاشتراكات',        date: '22 سبتمبر', amount: 140,   weight: 'soft' as const },
  { day: 25, title: 'تحويل إلى ماما',    date: '25 سبتمبر', amount: 1_200, weight: 'hard' as const, reason: 'ماما تنتظره' },
  { day: 28, title: 'إلى «المستقبل»',    date: '28 سبتمبر', amount: 2_000, weight: 'soft' as const },
]

/** §4.1 — перенос на неделю: дата + 7; за пределом месяца — следующий месяц, метка уходит с кольца. */
export const NEXT_MONTH_LABEL = 'أكتوبر'
export function movedDate(day: number) {
  const next = day + 7
  return next <= MONTH.days
    ? { day: next, label: `${next} ${MONTH.label}`, inMonth: true }
    : { day: next - MONTH.days, label: `${next - MONTH.days} ${NEXT_MONTH_LABEL}`, inMonth: false }
}

/** §12 — состояние данных: последний ответ пришёл в 14:20, это вчера относительно 9:41. */
export const DATA = { lastSeen: '14:20' }

/** §12 — легенда кольца: по строке на каждый знак. */
export const LEGEND = [
  { kind: 'hard' as const, title: 'علامة ممتلئة', note: 'التزام ثابت — لا يمكن تأجيل اليوم كله' },
  { kind: 'soft' as const, title: 'علامة مفرغة', note: 'مرن — يمكن تأجيله أو تخطّيه' },
  { kind: 'tick' as const, title: 'طول الشرطة', note: 'ما صُرف في ذلك اليوم' },
  { kind: 'arc'  as const, title: 'القوسان', note: 'ما تبقّى من الشهر · وما مضى من اليوم' },
]

/** §5 — пройденные события месяца. */
export const PAST_EVENTS = [2, 5, 8]

/** §5.1 — повседневные траты по дням. */
export const SPEND: Record<number, number> = {
  1: 96, 2: 1_318, 3: 74, 4: 152, 5: 4_288, 6: 134,
  7: 64, 8: 1_052, 9: 106, 10: 82, 11: 118, 12: 76,
}

/**
 * §6 — люди. Кадр лежит рядом с именем: перевод — действие над человеком,
 * и лицо здесь содержание, а не украшение. У гамеи лица нет и не будет —
 * это круг из восьми, а не человек, и подставить ему чьё-то лицо значило бы
 * соврать о том, что это за объект.
 */
export const OWNER = { name: 'نور', initial: 'ن', photo: 'photos/nour.webp' }

export const PEOPLE = [
  { name: 'ماما',      initial: 'م', meta: '2 SEP',  reserve: 'hard' as const, photo: 'photos/mama.webp' },
  { name: 'يوسف',      initial: 'ي', meta: '28 AUG', reserve: null,            photo: 'photos/yusuf.webp' },
  { name: 'جمعية · 8', initial: 'ج', meta: '18 SEP', reserve: 'soft' as const, photo: null },
]

/**
 * §7.3 — кому ещё можно отправить. «Перевод» у троих — три разных дела:
 * маме международный, Юсуфу местный, гамея вообще не перевод, а взнос по обязательству.
 */
export const RECIPIENTS = [
  { id: 'mama', name: 'ماما · فاطمة', initial: 'م', city: 'القاهرة، مصر', kind: 'international' as const,
    account: 'CIB · ينتهي بـ 4471', amount: 1_200, quick: [800, 1_200, 1_500], arrival: '19:40', note: 'تحويل دولي',
    photo: 'photos/mama.webp' },
  { id: 'yusuf', name: 'يوسف', initial: 'ي', city: 'دبي', kind: 'local' as const,
    account: 'ENBD · ينتهي بـ 2210', amount: 300, quick: [200, 300, 500], arrival: 'فورًا', note: 'تحويل محلي',
    photo: 'photos/yusuf.webp' },
]

/** §8 — лента по смыслу. */
export const FEED = [
  { group: 'البيت',   detail: 'الإيجار · ديوا', amount: '5,120' },
  { group: 'العائلة', detail: 'ماما',           amount: '1,200' },
  { group: 'كل يوم',  detail: 'كارفور · كريم',  amount: '1,240' },
]

/** §11 — разделитель разрядов запятая: пробел в моноширинном рвёт число надвое. */
export const money = (n: number) => n.toLocaleString('en-US')

/** Накопления показаны отдельно и в баланс не входят. */
export const SAVINGS = 8_400

/** §7 — перевод домой. Резерв маме на 25-е — из §4; всё в его пределах исполняет план. */
export const TRANSFER = {
  recipient: { name: 'ماما · فاطمة', initial: 'م', city: 'القاهرة، مصر', account: 'CIB · ينتهي بـ 4471' },
  amount: 1_200,
  rate: 13.42,
  rateUntil: '11:42',
  feeFreeUpTo: 3_000,
  arrival: '19:40',
  quick: [800, 1_200, 1_500],
  reserveDay: 25,
  /** §7.2 — состояние insufficient: больше доступного маме (свободные + её резерв = 8,040). */
  insufficient: 8_500,
}

/** §7.2 — что получит мама: суммы в EGP стоят в фикстуре, а не считаются на лету. */
export const RECEIVES_EGP: Record<number, number> = { 800: 10_736, 1_200: 16_104, 1_500: 20_130 }

/* ── §9.1. Нехватка: 2 октября, зарплата не пришла ─────────────────────────── */

export const OCTOBER = {
  days: 31,
  today: 2,
  label: 'أكتوبر',
  weekday: 'الجمعة',
  /** Горизонт не называется датой: продукт не знает, когда придёт зарплата. */
  salaryExpected: '1 أكتوبر',
  balance: 6_540,
}

/**
 * §9.1 — момент кадра нехватки: 2 октября, вечер. Доля суток 0.52 — это
 * 12 ч 29 мин от фаджра, то есть 17:41. Прежде доля стояла в разметке голым
 * числом, а системная строка показывала утренние 9:41 сентябрьской фикстуры:
 * прибор и часы на одном экране говорили о разном времени.
 */
export const OCT_MOMENT = { now: '17:41', dayFraction: 0.52 }

/** §9.1 — обязательства октября впереди, 8,180. */
export const OCT_OBLIGATIONS = [
  { day: 5,  title: 'الإيجار',            date: '5 أكتوبر',  amount: 4_200, weight: 'hard' as const },
  { day: 18, title: 'الجمعية — اشتراكي',  date: '18 أكتوبر', amount: 500,   weight: 'soft' as const },
  { day: 20, title: 'الاتصال والإنترنت',  date: '20 أكتوبر', amount: 280,   weight: 'hard' as const },
  { day: 25, title: 'تحويل إلى ماما',     date: '25 أكتوبر', amount: 1_200, weight: 'hard' as const },
  { day: 28, title: 'إلى «المستقبل»',     date: '28 أكتوبر', amount: 2_000, weight: 'soft' as const },
]

/** §9.1 — прожитое в октябре: дыра видна на второй день, а не в конце. */
export const OCT_SPEND: Record<number, number> = { 1: 0, 2: 96 }

/**
 * §9.1 — что можно отодвинуть. Двигать предлагается только подвижное:
 * предложить человеку подвинуть перевод матери значит не понимать, что это за деньги.
 */
export const WAYS = [
  { day: 18, title: 'تأجيل الجمعية إلى نوفمبر', frees: 500 },
  { day: 28, title: 'تخطّي الادخار هذا الشهر',  frees: 2_000 },
]
