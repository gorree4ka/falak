"""Проверка нижней кромки экрана: контент не вылезает, хром прижат.

Зачем. Контракт даёт два правила про низ экрана — п.6 (safe-area 34 под нижним
прикреплённым контентом) и п.8 (рут не короче 852, ни один неабсолютный ребёнок
не вылезает за низ). Оба выражены **слагаемым внутри чужого числа**: «низ 50 =
16 + space-safe-bottom», «y = высота_экрана − высота_шторки». Переменной там нет,
есть константа, поэтому свип «есть ли токен» их не видит.

Проверка, которая видит: **низ последнего видимого неабсолютного ребёнка не ниже
низа рута, а `HomeIndicator` кончается ровно на кромке.** Она ловит весь класс
разом — и уехавший список (№195), и непереприколотую тёмную шторку, и рут,
который не вмещает собственный контент.

Прогон 04.08.2026: 188 кадров, **11 настоящих находок** — уехавшая тёмная
шторка ×3, рут, не вмещавший свой FAQ (×2), список под индикатором на
`HotelTours` и `HotelReviews` (×4), недоехавшие правки `Compare` (×2).

    python execution/figma_bottom.py > check.js   # печатает JS для use_figma

## Три проверки, и вторая нужна отдельно от первой

1. **Кромка рута** (п.8): ширина 393, высота ≥ 852, ни один видимый
   неабсолютный ребёнок не ниже низа рута, `HomeIndicator` кончается на кромке.
2. **Safe-area** (п.6): ни один **лист** не заходит ниже верхней кромки
   индикатора. Первую проверку это не дублирует: уехавшая карточка сидит внутри
   списка, а сам список за рут не вылезает — так `HotelTours` (№195) проходил
   проверку 1 и валился на проверке 2.
Третьей проверки — паритета высот светлой и тёмной секций — здесь нет: в Falak
тема живёт **режимом переменных**, а не второй копией кадров. Сравнивать нечего,
и парная секция в `project.json` не заводится.

## Почему в скрипте есть исключения и почему они записаны

Первая версия проверки 1 дала 44 флага, из которых **39 были её собственным
браком**: `Backdrop` (снимок под шторкой, намеренно выше рута) и `HomeIndicator`
внутри нарисованного телефона на онбординге.

Первая версия проверки 2 дала 82 флага, и почти все — **из-за одной строки**:
фильтр `x.visible` проверял сам узел, но не предков, а скрытый блок не снимает
`visible` с детей. Скрытые состояния экранов лезли в выборку целиком.

Оба раза чинилась проверка, а не файл. Отсюда правило: **у свипа, который нашёл
десятки нарушений подряд, первый подозреваемый — он сам.** И исключения живут
здесь вместе с причиной, а не в голове проверяющего: проверка, у которой девять
срабатываний из десяти ложные, перестаёт читаться на втором прогоне.
"""
from __future__ import annotations

import io
import sys

JS = r"""
// Три инварианта низа экрана. Исключения и их причины — execution/figma_bottom.py.
const SKIP = ['Backdrop', 'DimOverlay', 'HomeIndicator', 'TabBar', 'Keypad', 'Figmap', 'Basemap image'];
const MOCKUP = ['Onboarding', 'Deck'];
const page = await figma.getNodeByIdAsync('%%PAGE_SCREENS%%');
await figma.setCurrentPageAsync(page);
const edge = [], safe = [];
{
  const sec = await figma.getNodeByIdAsync('%%SEC_SCREENS%%');
  for (const f of sec.findAll(n => n.type === 'FRAME' && n.name.startsWith('Screen/'))) {
    const H = Math.round(f.height);
    const mockup = MOCKUP.some(m => f.name.includes(m));

    // 1. Кромка рута: п.8 контракта
    if (Math.round(f.width) !== 393) edge.push(f.name + ': ширина ' + Math.round(f.width));
    if (H < 852) edge.push(f.name + ': высота ' + H + ' < 852');
    for (const c of f.children) {
      if (!c.visible || c.layoutPositioning === 'ABSOLUTE' || SKIP.includes(c.name)) continue;
      const b = Math.round(c.y + c.height);
      if (b > H) edge.push(f.name + ': ' + c.name + ' вылезает на ' + (b - H));
    }
    // 1б. Низ шторки принадлежит устройству: HUG-шторка после ужатия ручки всплывала над кромкой (№158)
    for (const c of f.children) {
      if (!c.visible || !/^Sheet\//.test(c.name)) continue;
      const b = Math.round(c.y + c.height);
      if (b !== H) edge.push(f.name + ': ' + c.name + ' низ ' + b + ' при кадре ' + H);
    }
    const hi = f.findOne(n => n.name === 'HomeIndicator' && n.visible);
    if (hi && !mockup && Math.round(hi.y + hi.height) !== H)
      edge.push(f.name + ': HomeIndicator низ ' + Math.round(hi.y + hi.height) + ' при руте ' + H);

    // 2. Safe-area: п.6. Ни один ЛИСТ не заходит ниже верхней кромки индикатора.
    //    Проверять надо листья, а не прямых детей: уехавшая карточка сидит
    //    внутри списка, и сам список за рут не вылезает (случай №195).
    if (hi && hi.absoluteBoundingBox && !mockup) {
      const line = hi.absoluteBoundingBox.y;
      for (const n of f.findAll(x => x.visible && x.absoluteBoundingBox && (!x.children || !x.children.length))) {
        // ⚠️ Видимость предков обязательна: скрытый блок НЕ снимает visible с детей
        let p = n, skip = false;
        while (p && p !== f) { if (!p.visible || SKIP.includes(p.name)) { skip = true; break } p = p.parent }
        if (skip || SKIP.includes(n.name)) continue;
        const over = Math.round(n.absoluteBoundingBox.y + n.absoluteBoundingBox.height - line);
        if (over > 0) { safe.push(f.name + ': ' + n.name.slice(0, 24) + ' на ' + over + ' под индикатором'); break }
      }
    }

  }
}
return { кромка: edge, safeArea: safe, итог: edge.length + safe.length };
"""


def main() -> int:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    print(JS.strip())
    return 0


from project import need  # noqa: E402

JS = (JS.replace('%%PAGE_SCREENS%%', need('figma.pages.screens', u'id страницы экранов'))
        .replace('%%SEC_SCREENS%%', need('figma.sections.screens', u'id секции экранов')))

if __name__ == '__main__':
    raise SystemExit(main())
