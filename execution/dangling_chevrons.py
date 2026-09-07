# -*- coding: utf-8 -*-
"""
Сканер шевронов, которые обещают переход и не ведут никуда.

Зачем пятый сканер. Четыре прежних ловят три разных класса, и **этот дефект
проскочил мимо всех трёх**:

- `inert_controls.py` разбирает **органы кита** — `Button`, `ListItem`,
  `IconButton`. Голого `<Icon>` внутри обычного `div` он не знает;
- `painted_links.py` ищет **крашеный текст** и намеренно отсеивает `<Icon>`:
  акцентный глиф — это марка («про ИИ», «про важное»), а не обещание;
- `mute_press.py` и `leaky_handlers.py` работают там, где обработчик уже есть.

Найдено глазами 06.08.2026 (`ia/open-questions.md` №338): на `TourDetails` строка
отеля несла `chevron-right` и **не имела обработчика вовсе**. Дока при этом
защищала шеврон именно переходом — «там блок контекст, тут переход, которого
требует ФТ». То есть переход существовал **только в тексте, которым его
обосновали**, и дока читалась как свидетельство исправности.

**Правило, которое проверяется: `chevron-right` — обещание перехода на другой
экран, и оно обязано вести.** Формулировка не новая: ровно так `ListItem`
описывает свой слот шеврона (`ds/components.md`), и ровно на этом основании
06.08.2026 шевроны сняли с полностью кликабельных карточек (№317). Здесь тот же
довод с другой стороны: там глиф дублировал живое действие, тут — заменял
отсутствующее.

## Как ищем

Токенизируем JSX и держим стек открытых элементов. Дойдя до `chevron-right`,
смотрим **весь стек предков**: если хоть один несёт `onClick`, `href`,
`role="button"`, `tabIndex` или сам является `<button>`/`<a>` — обещание
обеспечено. Проверять только прямого родителя нельзя: в `ExcursionTeaser` и
`AIOnramp` глиф лежит на дне `<button>`, и это правильно.

## Отсев

- **`chevron-down` / `chevron-up` не проверяются.** Они обещают раскрытие в
  пределах экрана, а не переход, и живут в аккордеонах, где действие на строке.
- **Мастера кита с пропом-обработчиком** (`ListItem`, `AIOnramp`,
  `ExcursionTeaser`): у них обработчик приходит снаружи, и его отсутствие — дело
  носителя, а не компонента. Это зона `inert_controls.py`, и дублировать её
  здесь значило бы получать одну находку дважды.
- **`chevronIcon={...}` в пропах** — это настройка компонента кита, а не глиф в
  разметке; за неё отвечает сам компонент.

Использование:
    python execution/dangling_chevrons.py
    python execution/dangling_chevrons.py app/src/screens/TourDetails
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if not (ROOT / 'app' / 'src').is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')

SRC = ROOT / 'app' / 'src'

# Мастера, чей обработчик приходит пропом: их пустоту ловит inert_controls.py
KIT_OWN = {
    'components/ListItem/ListItem.tsx',
    'components/AIOnramp/AIOnramp.tsx',
    'components/ExcursionTeaser/ExcursionTeaser.tsx',
}

# Признаки того, что элемент — цель нажатия
LIVE = re.compile(r'onClick|onKeyDown|href=|role=["\']button["\']|tabIndex')
LIVE_TAG = re.compile(r'^(button|a)$')

# Значение-выражение в атрибуте: до трёх уровней вложенных фигурных скобок.
# Меньше нельзя: `onKeyDown={(e) => { if (…) { … } }}` — это уже три, и на двух
# разбор обрывался посреди тега, а тег без своих атрибутов выглядел мёртвым.
_L1 = r'\{[^{}]*\}'
_L2 = r'\{(?:[^{}]|%s)*\}' % _L1
_L3 = r'\{(?:[^{}]|%s)*\}' % _L2
# Открывающий тег, закрывающий тег, самозакрывающийся тег
TAG = re.compile(r'<(/?)([A-Za-z][\w.]*)((?:[^<>{}]|%s)*?)(/?)>' % _L3, re.S)


def scan(text):
    """Возвращает список (номер строки, обеспечено ли обещание)."""
    stack = []
    found = []
    for m in TAG.finditer(text):
        closing, name, attrs, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if closing:
            if stack and stack[-1][0] == name:
                stack.pop()
            continue
        live = bool(LIVE.search(attrs)) or bool(LIVE_TAG.match(name.lower()))
        if 'chevron-right' in attrs and 'chevronIcon' not in attrs:
            covered = live or any(s[1] for s in stack)
            found.append((text.count('\n', 0, m.start()) + 1, covered))
        if not selfclose:
            stack.append((name, live or (stack[-1][1] if stack else False)))
    return found


def main(argv):
    targets = [Path(a) for a in argv[1:]] or [SRC]
    files = []
    for t in targets:
        p = t if t.is_absolute() else ROOT / t
        files.extend(sorted(p.rglob('*.tsx')) if p.is_dir() else [p])

    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False)
    total = 0
    for f in files:
        rel = f.relative_to(ROOT).as_posix()
        if rel.endswith('.stories.tsx'):
            continue
        if any(rel.endswith(k) for k in KIT_OWN):
            continue
        text = io.open(f, encoding='utf-8').read()
        if 'chevron-right' not in text:
            continue
        bad = [ln for ln, ok in scan(text) if not ok]
        for ln in bad:
            out.write('%s:%d  chevron-right без цели перехода\n' % (rel, ln))
            total += 1

    out.write('\nвсего шевронов без цели: %d\n' % total)
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
