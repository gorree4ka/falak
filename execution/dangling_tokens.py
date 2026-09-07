# -*- coding: utf-8 -*-
u"""Сканер висячих токенов: `var(--x)`, за которым нет определения.

Зачем скрипт, а не глаз. Ссылка на несуществующую переменную в CSS **не
подсвечивается нигде**: ни сборка, ни линтер, ни консоль браузера о ней не
скажут. Браузер объявление с невалидным `var()` просто выбрасывает целиком —
свойство откатывается к начальному значению. Поэтому дефект выглядит не как
ошибка, а как решение дизайнера: плашка «аккуратная, без заливки».

Так и нашлось 07.09.2026: `--sheen-short: var(--clay-850)`, а ступени
`--clay-850` в примитивах не было. В ночи вся заливка `NoticeRow` уходила в
`none` — оставалась одна кромка. Днём тот же токен ссылался на существующий
`--clay-50` и работал, поэтому на светлой теме дефекта не видно вовсе.

⚠️ **Цена ошибки тем выше, чем аккуратнее выглядит поломка.** Пропавшая заливка
читается как задумка и живёт до сверки с макетом. Отсюда правило: висячая
ссылка — находка, даже если экран выглядит хорошо.

Две проверки:

1. **Висячая ссылка** — `var(--x)` есть, `--x:` нет нигде: ни в примитивах, ни в
   семантике, ни локально в том же модуле, ни в inline-стиле из `.tsx`.
2. **Токен мимо основы** — имя объявлено только внутри `[data-theme="day"]` и
   пропущено в `:root`. Ночь ведущая (CONTRACT №16): всё, чего нет в `:root`,
   ночью не существует. Обратное — имя в `:root` без пары в дне — законно:
   так живут токены, у которых значение одно на обе темы (`--shadow-none`).

3. **Составной токен, застывший в одной теме** — токен объявлен в `:root`,
   внутри у него `var(--y)`, и `--y` переобъявлен под тему. Так не работает:
   **var() подставляется там, где свойство объявлено, а не там, где использовано.**
   Значение застывает ночным на `:root`, и вся дневная тема наследует его готовым.

   Так и нашлось 07.09.2026: `--texture-hatch` с белой линией `--texture-line`.
   Ночью верно, днём белая штриховка на известняке невидима — шторка выглядела
   гладкой рядом с фактурным диском, и это опять читалось как решение дизайнера,
   а не как дефект. Лечится объявлением составного токена в каждой теме.

`var(--x, запасное)` с запасным значением не находка: объявление переживает
отсутствие `--x`, это законный приём.

    python execution/dangling_tokens.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'app' / 'src'
if not SRC.is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')

SEMANTICS = SRC / 'tokens' / 'semantics.css'

# `--name:` — объявление. Внутри `var(--name)` двоеточия нет, поэтому спутать не с чем.
DEF_CSS = re.compile(r'(--[A-Za-z0-9_-]+)\s*:')
# в .tsx объявление живёт в объекте стиля: {'--name': …}
DEF_TSX = re.compile(r'''["'](--[A-Za-z0-9_-]+)["']\s*:''')
# использование; вторая группа — запятая, то есть запасное значение
USE = re.compile(r'var\(\s*(--[A-Za-z0-9_-]+)\s*(,?)')
# блок темы: `:root {` или `[data-theme="day"] {` от начала строки
THEME = re.compile(r'(?m)^(\S[^{\n]*)\{')
# объявление вместе со значением: имя до двоеточия, значение до `;`
DECL = re.compile(r'(--[\w-]+)\s*:\s*([^;{}]*);', re.S)


def files(*suffixes):
    for p in sorted(SRC.rglob('*')):
        if p.suffix in suffixes and p.is_file():
            yield p


def defined_names():
    names = set()
    for p in files('.css'):
        names |= set(DEF_CSS.findall(p.read_text(encoding='utf-8')))
    for p in files('.tsx', '.ts'):
        names |= set(DEF_TSX.findall(p.read_text(encoding='utf-8')))
    return names


def theme_blocks():
    u"""Имена, объявленные в каждом верхнеуровневом блоке `semantics.css`."""
    if not SEMANTICS.exists():
        return {}
    text = SEMANTICS.read_text(encoding='utf-8')
    blocks, marks = {}, [(m.start(), m.group(1).strip()) for m in THEME.finditer(text)]
    for i, (pos, sel) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        blocks[sel] = set(DEF_CSS.findall(text[pos:end]))
    return blocks


def root_decls():
    u"""Объявления внутри `:root { … }` в файлах токенов: имя → значение.

    Только они и опасны для третьей проверки. Тот же приём внутри компонента
    (`.row[data-state] { --base: var(--surface-free) }`) законен: там свойство
    объявлено **внутри** темы и подставляется её значением.
    """
    out = {}
    for p in (SRC / 'tokens' / 'primitives.css', SEMANTICS):
        if not p.exists():
            continue
        text = p.read_text(encoding='utf-8')
        for m in re.finditer(r'(?ms)^:root\s*\{(.*?)^\}', text):
            for d in DECL.finditer(m.group(1)):
                out.setdefault(d.group(1), (p, d.group(2)))
    return out


def run():
    known = defined_names()
    dangling = []
    for p in list(files('.css')) + list(files('.tsx', '.ts')):
        rel = p.relative_to(ROOT).as_posix()
        for n, line in enumerate(p.read_text(encoding='utf-8').splitlines(), 1):
            for name, fallback in USE.findall(line):
                if fallback or name in known:
                    continue
                dangling.append(u'%s:%d — var(%s) без объявления' % (rel, n, name))

    lonely = []
    blocks = theme_blocks()
    roots = root_decls()
    base = blocks.get(':root', set()) | set(roots)

    # Составной токен на :root, ссылающийся на переобъявлённый темой.
    themed = set()
    for sel, names in blocks.items():
        if sel != ':root':
            themed |= names
    frozen = []
    for name, (src, value) in sorted(roots.items()):
        if name in themed:                # сам объявлен в каждой теме — всё в порядке
            continue
        for ref, _ in USE.findall(value):
            if ref in themed:
                frozen.append(
                    u'%s: %s ссылается на %s, а тот переобъявлен под тему — '
                    u'значение застынет базовым' % (src.relative_to(ROOT).as_posix(), name, ref))
                break
    for sel, names in blocks.items():
        if sel == ':root':
            continue
        for name in sorted(names - base):
            lonely.append(u'%s объявлен только в «%s», в :root пропущен' % (name, sel))

    print(u'токенов объявлено: %d · тем в semantics.css: %d' % (len(known), len(blocks)))
    bad = dangling + lonely + frozen
    if bad:
        print(u'\nнаходок: %d' % len(bad))
        for b in bad[:40]:
            print(u'  ' + b)
        return 1
    print(u'\nчисто: каждый var(--x) объявлен, ни один токен не живёт мимо :root,'
          u'\nсоставные токены объявлены в каждой теме')
    return 0


if __name__ == '__main__':
    raise SystemExit(run())
