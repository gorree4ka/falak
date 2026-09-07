"""
Сканер обработчиков, в которые протекает DOM-событие.

Дефект. Компонент кита объявляет проп как `onBack?: () => void` — «зовут без
аргументов» — и отдаёт его прямо в DOM-элемент:

    <button onClick={onBack}>

React подставляет первым аргументом **объект события**, и тип этому не мешает:
функция с необязательным параметром (`(state?: string) => void`) присваивается
типу `() => void` совершенно законно. TypeScript молчит.

Пока обработчик аргумент игнорирует, вреда нет. Но `nav.pop(state?)` его не
игнорирует: `onBack={nav.pop}` превращал событие в значение состояния, и экран
под возвратом открывался с `state`, которого нет ни в одной семье. «Мои заказы»
показывались пустыми — они единственные проверяют состояние **списком
разрешённых**, а не отрицанием, и потому единственные падали заметно. Остальные
восемнадцать экранов молча получали мусор и выглядели нормально.

**Класс ловился 04.08.2026 и вернулся 05.08.2026**, потому что в первый раз
чинили вызывающих (восемь файлов), а не кит. Правило поэтому написано на стороне
кита: **если проп объявлен как `() => void`, компонент обязан звать его без
аргументов** — `onClick={() => onBack?.()}`.

Как ищем. В каждом `.tsx` кита — атрибуты `on*={onXxx}` у **строчных** тегов
(`button`, `div`, `span`): только DOM-элементам React подставляет событие.
Передача пропа в React-компонент (`<Button onClick={onDocs}>`) утечкой не
является — тот зовёт проп сам и подставляет ровно то, что объявил.

Отсев: обработчики, объявленные с параметром (`onChange?: (next: boolean) => …`),
— там аргумент нужен и приходит от своего же компонента, а не от DOM.

Использование:
    python execution/leaky_handlers.py
    python execution/leaky_handlers.py app/src/screens
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if not (ROOT / 'app' / 'src').is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')


# `on*={onXxx}` — голая передача. Стрелка, `() =>`, `void` и прочее сюда не попадёт.
BARE = re.compile(r'\bon[A-Z]\w*=\{(on[A-Z]\w*)\}')
# Открывающий тег непосредственно перед атрибутом: строчный — DOM, с заглавной — компонент.
TAG = re.compile(r'<([a-zA-Z][\w.]*)\b')


def declared_zero_arg(src: str, prop: str) -> bool:
    """Объявлен ли проп как `() => void`, то есть «зовут без аргументов»."""
    m = re.search(rf'\b{re.escape(prop)}\??:\s*\(([^)]*)\)\s*=>', src)
    return bool(m) and m.group(1).strip() == ''


def scan(path: Path) -> list[tuple[int, str, str]]:
    src = path.read_text(encoding='utf-8')
    out: list[tuple[int, str, str]] = []
    for m in BARE.finditer(src):
        prop = m.group(1)
        tags = TAG.findall(src[:m.start()])
        if not tags:
            continue
        tag = tags[-1]
        # Событие подставляет только DOM-элемент; React-компонент зовёт проп сам
        if not tag[0].islower():
            continue
        if not declared_zero_arg(src, prop):
            continue
        line = src.count('\n', 0, m.start()) + 1
        out.append((line, tag, m.group(0)))
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    targets = sys.argv[1:] or ['app/src']
    total = 0
    for target in targets:
        base = ROOT / target
        for f in sorted(base.rglob('*.tsx')):
            if f.name.endswith('.stories.tsx'):
                continue
            hits = scan(f)
            if not hits:
                continue
            print(f'\n{f.relative_to(ROOT).as_posix()}')
            for line, tag, snippet in hits:
                print(f'  {line:>4}  <{tag}>  {snippet}')
            total += len(hits)
    print(f'\nвсего протекающих обработчиков: {total}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
