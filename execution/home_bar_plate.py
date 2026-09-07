# -*- coding: utf-8 -*-
u"""Сканер нижних 34: не едет ли содержимое под полосой home-индикатора.

Четвёртый сканер оживления, и класс у него свой. Три предыдущих читают
исходники; этот читает **живой экран** — потому что проверяемое правило про
геометрию во время прокрутки, а её в коде не видно: `position: absolute;
bottom: 0` выглядит совершенно нормально и означает «прижат к низу
**содержимого**», то есть уезжает вверх вместе со списком.

Дефект пользователь находил дважды: 05.08.2026 («список едет под индикатором»
на `HotelTours`) и 07.08.2026 («на Моём заказе и в Поддержке подложки нет») —
второй раз ровно потому, что первую правку прогнали по трём экранам из
тридцати. Разбор правила — `ds/patterns.md`, «Нижние 34 принадлежат
устройству».

## Что именно проверяется

Экран открывается в галерее, прокручивается **в середину**, и в нижних 34
пикселях вьюпорта ищется содержимое. Дефект — не прозрачность: пустой фон
экрана полосе не мешает. Дефект — когда под полосой **проезжают карточки**.

Полоса считается удержанной, если её держит прикреплённый непрозрачный
элемент: сам индикатор (`sticky` + заливка), прижатый футер или таб-бар.

## Две ошибки самой проверки, обе стоили прогона

1. **Подложку несёт обёртка экрана, а не корень `HomeIndicator`.** Первая
   версия читала `background` не с того узла и объявила голыми все экраны,
   которые как раз починены.
2. **Распорка не заменяет короткий экран.** Чтобы заставить прокрутиться то,
   что на 393×852 стоит неподвижно, первая версия дописывала блок в конец
   скроллера — и отклеивала липкие элементы, ограниченные своим рутом. Ужимать
   надо **вьюпорт**, а не растить содержимое.

   ⚠️ Отсюда правило: **«прокручивается ли экран» — свойство сессии, а не
   экрана.** Устройств в приложении три, и на SE 375×667 прокручивается то,
   что на 15 Pro стоит. Поэтому вьюпорт ужимается до 520 у всех.

Требует поднятого дев-сервера (`npm run dev`). Зонд кладётся в `app/public/`
на время прогона и удаляется после.

    python execution/home_bar_plate.py
"""

import io, json, os, re, subprocess, sys

from project import APP
ROOT = str(APP)
import os as _os
if not _os.path.isdir(_os.path.join(ROOT, 'src')):
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')

SCR = os.environ.get('TEMP', '.')
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHROME = os.environ['LOCALAPPDATA'] + r'\Google\Chrome\Application\chrome.exe'

src = io.open(ROOT + '/src/screens/registry.ts', encoding='utf-8').read()
routes = []
for m in re.finditer(r"\n    id: '([a-z0-9-]+)',", src):
    sid = m.group(1)
    tail = src[m.end():m.end() + 2000]
    block = tail.split('states: [')
    if len(block) < 2:
        continue
    for st in re.findall(r"\{ id: '([A-Za-z0-9-]+)'", block[1].split(']')[0]):
        routes.append([sid, st])

PROBE = u"""<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}iframe{width:560px;height:1100px;border:0}</style>
<pre id="out"></pre><iframe id="f"></iframe>
<script>
const ROUTES = %s
const out = document.getElementById('out')
const f = document.getElementById('f')
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const alpha = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return 0
  const p = m[1].split(','); return p.length < 4 ? 1 : parseFloat(p[3]) }

let n = 0
async function one(id, state) {
  // Смена только хеша событие load не поднимает — документ тот же. Запрос в
  // строке делает каждый заход новым документом.
  f.src = 'http://localhost:5173/?i=' + (++n) + '#/screen/' + id + '/' + state
  await new Promise(r => { f.onload = r })
  await wait(500)
  const d = f.contentDocument
  const bar = d.querySelector('.ds-home-bar')
  // Отличаем «полосы нет в продукте» от «зонд не дождался кадра»: без этого
  // непоставленная проверка отчитывается нулём находок и читается как «чисто».
  if (!bar) return { id, state, mounted: d.body.children.length > 0, verdict: 'нет индикатора' }
  // Подложку несёт обёртка экрана, а не корень компонента: поднимаемся до
  // первого узла, который вообще прикреплён к чему-то.
  let ind = bar.parentElement
  while (ind.parentElement && getComputedStyle(ind).position === 'static') ind = ind.parentElement
  let vp = ind.parentElement
  while (vp && !/auto|scroll/.test(getComputedStyle(vp).overflowY)) vp = vp.parentElement
  if (!vp) return { id, state, verdict: 'нет вьюпорта' }
  // На коротком содержимом экран не прокручивается — но в приложении есть SE
  // 375×667, где прокрутится и он. Ужимаем вьюпорт, а не растим содержимое:
  // липкий элемент ограничен своим рутом, и распорка ниже рута его отклеила бы.
  let padded = false
  if (vp.scrollHeight <= vp.clientHeight + 2) {
    vp.style.height = '520px'
    padded = true
    await wait(60)
  }
  vp.scrollTop = Math.round((vp.scrollHeight - vp.clientHeight) / 2)
  await wait(120)
  const vr = vp.getBoundingClientRect()
  const top = vr.bottom - 34, bottom = vr.bottom
  const ir = ind.getBoundingClientRect()
  const stuck = Math.abs(ir.bottom - bottom) <= 1.5
  const indOpaque = alpha(getComputedStyle(ind).backgroundColor) > 0
  const covers = []
  for (const el of d.querySelectorAll('*')) {
    if (el === ind || ind.contains(el)) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'static' || cs.position === 'relative') continue
    if (alpha(cs.backgroundColor) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width >= 300 && r.top <= top + 1 && r.bottom >= bottom - 1) covers.push(el.className.toString().slice(0, 24))
  }
  // Полоса «голая» не когда под ней прозрачно, а когда под ней **едет
  // содержимое**: пустой фон экрана полосе не мешает.
  const held = (stuck && indOpaque) || covers.length > 0
  const intruders = []
  if (!held) {
    for (const el of d.querySelectorAll('*')) {
      if (el === ind || ind.contains(el) || el.contains(ind)) continue
      const r = el.getBoundingClientRect()
      if (r.bottom <= top + 1 || r.top >= bottom - 1 || r.width < 8) continue
      const cs = getComputedStyle(el)
      const paints = alpha(cs.backgroundColor) > 0 || cs.borderBottomWidth !== '0px'
        || el.tagName === 'IMG' || el.tagName === 'svg'
      const leafText = el.children.length === 0 && el.textContent.trim().length > 0
      if (paints || leafText) intruders.push(el.className.toString().slice(0, 22) || el.tagName)
    }
  }
  const ok = held || intruders.length === 0
  return { id, state, verdict: ok ? 'ок' : (padded ? 'ГОЛАЯ (на коротком)' : 'ГОЛАЯ'),
           stuck, indOpaque, padded, cover: covers[0] || '—', under: intruders.slice(0, 3) }
}

(async () => {
  const rows = []
  for (const [id, state] of ROUTES) {
    try { rows.push(await one(id, state)) }
    catch (e) { rows.push({ id, state, verdict: 'ошибка: ' + e.message }) }
  }
  out.textContent = JSON.stringify(rows)
})()
</script>
""" % json.dumps(routes)

os.makedirs(ROOT + '/public', exist_ok=True)   # каталога может не быть: Vite его не требует
io.open(ROOT + '/public/band.html', 'w', encoding='utf-8').write(PROBE)

dom = subprocess.run(
    [CHROME, '--headless', '--disable-gpu', '--virtual-time-budget=240000',
     '--window-size=600,1200', '--dump-dom', 'http://localhost:5173/band.html'],
    capture_output=True, timeout=600).stdout.decode('utf-8', 'replace')

m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
rows = json.loads(m.group(1)) if m and m.group(1).strip() else []
bare = [r for r in rows if r['verdict'] == 'ГОЛАЯ']
io.open(SCR + '/band.json', 'w', encoding='utf-8').write(json.dumps(rows, ensure_ascii=False, indent=1))

os.remove(ROOT + '/public/band.html')

# Замер, которого не было, — не «чисто». Без дев-сервера зонд возвращает пустые
# вердикты, и молчаливый ноль читается как пройденная проверка.
mute = [r for r in rows if not r['verdict'] or r['verdict'].startswith(u'нет ')]
# Кадр смонтировался, а полосы нет ни на одном экране — в этом прототипе её и не
# рисуют: безопасную зону несёт собственный нижний отступ таб-бара
# (`--space-safe-bottom`). Это не находка и не провал, а неприменимость.
absent = rows and all(r.get('mounted') and r['verdict'] == u'нет индикатора' for r in rows)
if absent:
    print(u'полосы домашнего индикатора в прототипе нет ни на одном из %d кадров —'
          % len(rows))
    print(u'безопасную зону несёт нижний отступ таб-бара (--space-safe-bottom).')
    print(u'проверка неприменима, пока полоса не появится.')
    raise SystemExit(0)

print('проверено:', len(rows) - len(mute), 'из', len(routes))
for r in rows:
    if r['verdict'] not in ('ок', 'не прокручивается'):
        print(' ', r['id'], '/', r['state'], '->', r['verdict'] or u'нет измерения', r.get('under', ''))
print('голых:', len(bare))
if not rows or len(mute) == len(rows):
    print(u'зонд ничего не измерил — поднят ли дев-сервер на localhost:5173 (npm run dev)?')
    raise SystemExit(2)
raise SystemExit(1 if bare else 0)
