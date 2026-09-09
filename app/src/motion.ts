import gsap from 'gsap'

/**
 * Движение прототипа. Длительности берутся из токенов `--motion-*`, а не
 * дублируются числами: один источник для CSS-переходов и для GSAP.
 *
 * Правило одно: двигается только то, что несёт данные. Кольцо раскрывается,
 * потому что показания прибора появляются; число считается, потому что
 * оно — результат расчёта; метка «сейчас» дышит, потому что это «сейчас».
 * Декоративного движения нет.
 */

/* В разработке движение доступно зондам: headless-браузер не крутит кадры,
   и проверка конечного состояния делается перемоткой `globalTimeline.seek()`. */
if (import.meta.env.DEV) (window as unknown as { __falakMotion?: unknown }).__falakMotion = { gsap }

/** `--motion-orbit: 900ms cubic-bezier(…)` → 0.9. Нет токена — запасное значение. */
export function motionSec(token: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const m = /^(\d+(?:\.\d+)?)(ms|s)\b/.exec(raw)
  if (!m) return fallbackMs / 1000
  return m[2] === 's' ? parseFloat(m[1]) : parseFloat(m[1]) / 1000
}

/**
 * Порог скорости маха, px/мс. Быстрый короткий мах — такой же жест, как долгий
 * сдвиг: направление человек уже показал, и требовать дотянуть до расстояния
 * значит не ответить на движение. Значение из практики жестовых шторок.
 */
export const FLICK_SPEED = 0.11

/**
 * Ход, ниже которого мах не считается махом, px. Без него дрожание пальца при
 * нажатии проходит по скорости — три пикселя за десять миллисекунд быстрее
 * любого порога, — и обычный тап срабатывает как жест, да ещё в случайную
 * сторону. Скорость решает, куда, но сначала должно быть движение.
 */
export const FLICK_MIN = 8

/** Сдвиг засчитан: ушёл за порог расстояния **или** был быстрым махом. */
export function swipedPast(distance: number, elapsedMs: number, threshold: number): boolean {
  const travel = Math.abs(distance)
  return travel >= threshold
      || (travel >= FLICK_MIN && travel / Math.max(1, elapsedMs) > FLICK_SPEED)
}

/** Пользователь попросил систему поменьше двигать — уважаем, показываем сразу конечное состояние. */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Раскрытие кольца при появлении: обод, затем поле гравировки по кругу,
 * дуга остатка рисуется от «сегодня» к концу месяца, метки встают последними,
 * и точка «сейчас» начинает дышать. Полная орбита — ≈ токен `--motion-orbit`.
 */
export function orbitReveal(svg: SVGSVGElement, opts: { mini?: boolean } = {}) {
  const ctx = gsap.context(() => {
    if (reducedMotion()) return
    const d = motionSec('--motion-orbit', 900)
    const q = gsap.utils.selector(svg)

    const arc = svg.querySelectorAll<SVGPathElement>('[data-motion="arc"]')
    for (const p of arc) {
      const len = p.getTotalLength()
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: d, ease: 'power2.inOut', delay: opts.mini ? 0 : d * 0.35,
          clearProps: 'strokeDasharray,strokeDashoffset' })
    }
    if (opts.mini) return

    gsap.from(q('[data-motion="ring"]'), { opacity: 0, duration: d * 0.5, ease: 'power2.out' })
    gsap.from(q('[data-motion="tick"]'), {
      opacity: 0, duration: d * 0.4, ease: 'power2.out', stagger: { each: d * 0.012, from: 'start' },
    })
    gsap.from(q('[data-motion="numeral"]'), { opacity: 0, duration: d * 0.5, delay: d * 0.4, ease: 'power2.out' })
    gsap.from(q('[data-motion="mark"]'), {
      scale: 0, transformOrigin: 'center', opacity: 0, duration: d * 0.4, delay: d * 0.7,
      ease: 'back.out(2)', stagger: d * 0.05,
    })
    gsap.from(q('[data-motion="today"]'), {
      scale: 0, transformOrigin: 'center', duration: d * 0.5, delay: d * 0.9, ease: 'back.out(2.5)',
    })
    /*
      Суточная дуга не поворачивается твином, а дорисовывается: GSAP-поворот
      группы затирал inline-трансформацию React и крутил её вокруг (0,0), а не
      вокруг центра кольца — элемент улетал за кадр и пропадал (№146).
      Дуга задана штрихом, поэтому «вырастает» она сдвигом штриха — и растёт
      от фаджра, то есть от верха круга (№165).
    */
    for (const hand of svg.querySelectorAll<SVGCircleElement>('[data-motion="day"] circle')) {
      const seg = parseFloat((hand.getAttribute('stroke-dasharray') || '0').split(/\s+/)[0]) || 0
      gsap.fromTo(hand, { strokeDashoffset: seg }, { strokeDashoffset: 0, duration: d, ease: 'power3.out', clearProps: 'strokeDashoffset' })
    }

    /* «Сейчас» — единственное, что живёт после раскрытия: медленное дыхание свечения. */
    gsap.to(q('[data-motion="today"]'), {
      opacity: 0.72, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: d * 1.4,
    })
  }, svg)
  return () => ctx.revert()
}

/**
 * Число считается от нуля до значения: так видно, что это результат, а не константа.
 * Форматирование — то же, что у `money()`: группы по три через запятую.
 */
export function countUp(el: HTMLElement, to: number) {
  if (reducedMotion() || !Number.isFinite(to)) { el.textContent = to.toLocaleString('en-US'); return () => {} }
  const state = { n: 0 }
  el.textContent = '0'
  const tween = gsap.to(state, {
    n: to, duration: motionSec('--motion-count', 640), ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(state.n).toLocaleString('en-US') },
  })
  return () => tween.kill()
}

/**
 * Число перетекает от прежнего значения к новому: так на переводе видно, что
 * «останется свободным» — результат, который пересчитался от выбора, а не
 * подменился. От нуля считают только при появлении (`countUp`); при смене
 * входа число едет от того, что человек только что видел.
 */
export function countTo(el: HTMLElement, from: number, to: number) {
  if (reducedMotion() || !Number.isFinite(from) || !Number.isFinite(to) || from === to) { el.textContent = to.toLocaleString('en-US'); return () => {} }
  const state = { n: from }
  const tween = gsap.to(state, {
    n: to, duration: motionSec('--motion-count', 640), ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(state.n).toLocaleString('en-US') },
  })
  return () => { tween.kill(); el.textContent = to.toLocaleString('en-US') }
}

/**
 * Курс защёлкивается: цифры перебираются и встают на место слева направо,
 * как у продукта, который взял живой курс и зафиксировал его. Единственное
 * место перебора в прототипе (`patterns.md`): у показания прибора такого
 * движения быть не может — оно сообщало бы, что число случайно. Перебираются
 * только цифры, разделители стоят; шрифт табличный, ширина не дёргается.
 * Длительность — токен `--motion-lock`.
 */
export function lockDigits(el: HTMLElement, final: string) {
  if (reducedMotion()) { el.textContent = final; return () => {} }
  const chars = Array.from(final)
  const slots = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0)
  if (slots.length === 0) { el.textContent = final; return () => {} }
  /* Пока экран едет на место (`motion-move`), цифры только перебираются;
     защёлкивание начинается после — иначе оно проходит под кадром загрузки,
     и человек застаёт уже готовый курс. Каждая цифра встаёт в свой срок:
     первая — на трети отведённого, последняя — в конце. */
  const lead = motionSec('--motion-move', 240)
  const lock = motionSec('--motion-lock', 480)
  const total = lead + lock
  const settle = slots.map((_, k) => (lead + lock * (0.35 + 0.65 * (k / Math.max(1, slots.length - 1)))) / total)
  const state = { p: 0 }
  let frame = -1
  const draw = () => {
    const tick = Math.floor(state.p * total * 1000 / 45)   // новый случайный глиф раз в 45 мс, иначе смазывается в серое
    if (tick === frame && state.p < 1) return
    frame = tick
    const out = chars.slice()
    slots.forEach((i, k) => { if (state.p < settle[k]) out[i] = String(Math.floor(Math.random() * 10)) })
    el.textContent = out.join('')
  }
  draw()
  const tween = gsap.to(state, {
    p: 1, duration: total, ease: 'none',
    onUpdate: draw, onComplete: () => { el.textContent = final },
  })
  return () => { tween.kill(); el.textContent = final }
}
