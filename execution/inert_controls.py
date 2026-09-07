"""
Сканер мёртвых органов управления в зеркале (`app/src`).

Директива `directive_wire.md`, Фаза 6 п.3: «действие без реакции» — самый частый
дефект оживления и самый незаметный: кнопка выглядит рабочей, пока в неё не ткнут.
Глазами такое ищут по одному экрану и находят половину — поэтому ищем разбором.

Что считается органом: элемент кита, который в продукте что-то делает, —
`Button`, `IconButton`, `ListItem`, `Chip role="action"`, `Checkbox`, `Input`,
`Card` со свойством `interactive`, `Tab`, `SegmentedControl`, `FavoriteButton`,
поля-кнопки (`SelectField`, `Radio`, `Toggle`, `Stepper`, `Keypad`, `TabItem`,
`PromptField`, `VerifyLink`, `CopyAction`).
Мёртвым он считается, если у него нет ни `onClick`, ни `onChange`, ни `onToggle`,
ни `onSelect`, ни `href`, ни `to`, ни проброса через `...props`.

🔺 **Полнота списка — это и есть точность сканера.** Пока компонента нет в
`CONTROLS`, его мёртвые применения невидимы, и итоговое число врёт в меньшую
сторону, не подавая никаких признаков. Так `SelectField` десять прогонов подряд
держал «всего 7» при большем реальном числе. Добавляя в кит компонент, который
рендерится кнопкой, добавляй его и сюда.

Разбор грубый и намеренно такой: ищем открывающий тег и дочитываем его до `>`
с учётом вложенных `{...}` и строк. Полный парсер JSX здесь не нужен — нужен
список мест, который человек дальше смотрит сам.

Использование:
    python execution/inert_controls.py            # весь app/src
    python execution/inert_controls.py app/src/screens/Home
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if not (ROOT / 'app' / 'src').is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')


# Органы управления кита. Значение — набор пропов, любой из которых оживляет.
CONTROLS: dict[str, set[str]] = {
    "Button": {"onClick", "href", "type", "...rest", "...props"},
    "IconButton": {"onClick", "href", "...rest", "...props"},
    "ListItem": {"onClick", "...rest", "...props"},
    "Checkbox": {"onChange", "onClick", "...rest", "...props"},
    "Input": {"onChange", "onInput", "onClick", "value", "...rest", "...props"},
    "FavoriteButton": {"onClick", "onToggle", "...rest", "...props"},
    # `closable` из списка убран 05.08.2026: крестик делает чип **органом**, а не
    # работающим органом. Чипы разбора AI на выдаче стояли с крестиком и без
    # обработчика — то есть обещали снятие, которого не происходило, и сканер их
    # пропускал по собственному правилу. Оживляет только обработчик.
    "Chip": {"onClick", "...rest", "...props"},
    "SegmentedControl": {"onChange", "onSelect", "...rest", "...props"},
    "TabBar": {"onSelect", "onChange", "...rest", "...props"},
    "ModuleAccordion": {"onToggle", "onClick", "...rest", "...props"},
    "CalendarDay": {"onClick", "...rest", "...props"},
    "MatrixCell": {"onClick", "...rest", "...props"},
    # Добавлено 10.08.2026 по находке симуляции (`ia/open-questions.md` №376).
    # Все они рендерятся кнопкой и оживают только пропом с экрана — то есть
    # ровно тот класс, ради которого сканер и написан. `SelectField` пропускался
    # с самого начала: он `<button {...rest}>`, и «Выберите возраст» на
    # `TouristsPicker` был мёртв во всех прогонах, показывавших «всего 7».
    "SelectField": {"onClick", "...rest", "...props"},
    "Stepper": {"onChange", "...rest", "...props"},
    "Keypad": {"onKey", "onBackspace", "...rest", "...props"},
    "TabItem": {"onClick", "...rest", "...props"},
    "PromptField": {"onChange", "onMic", "...rest", "...props"},
    "VerifyLink": {"onClick", "...rest", "...props"},
}

# Сюда не добавлять — проверено 10.08.2026, все три дали ложные срабатывания:
#
#   Radio, Toggle — **указатели состояния, а не органы.** Нажимает строка-родитель
#     (`Sort.tsx:42` — `role="radio"` с `onClick`; `ExtrasRow.tsx:38` — «свой
#     обработчик у него всплыл бы в обработчик строки и переключил услугу дважды»).
#     Собственный обработчик здесь был бы дефектом, а не признаком жизни.
#   CopyAction — **копирует сам** (`navigator.clipboard.writeText`, `CopyAction.tsx:45`).
#     `onCopy` — необязательное уведомление вызывающему, а не само действие.
#
# Общее правило: орган мёртв, если оживить его больше некому. Если обработчик
# лежит на родителе по замыслу — это не находка, и сканер обязан молчать.

# Файлы-определения самих компонентов и каталог: там орган объявляется,
# а не применяется, и отсутствие обработчика — норма.
SKIP = re.compile(r"[\\/](components|catalog)[\\/]|\.stories\.tsx$")

TAG = re.compile(r"<([A-Z][A-Za-z0-9]*)")


def attrs_of(src: str, start: int) -> tuple[str, int]:
    """Дочитывает открывающий тег от `<Name` до `>` через вложенные скобки и строки."""
    i, depth = start, 0
    quote = ""
    while i < len(src):
        ch = src[i]
        if quote:
            if ch == quote:
                quote = ""
        elif ch in "\"'`":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif ch == ">" and depth == 0:
            return src[start:i], i
        i += 1
    return src[start:], len(src)


def scan(path: Path) -> list[tuple[int, str, str]]:
    src = path.read_text(encoding="utf-8")
    found: list[tuple[int, str, str]] = []
    for m in TAG.finditer(src):
        name = m.group(1)
        live = CONTROLS.get(name)
        if live is None:
            continue
        body, end = attrs_of(src, m.end())
        # Чип без обработчика — метка, а не мёртвая кнопка: роль выводится из
        # поведения (`Chip.tsx`). Мёртв только тот, кто объявлен органом руками —
        # либо крестиком, который обещает снятие.
        if name == "Chip" and 'role="action"' not in body and "closable" not in body:
            continue
        # Строка без шеврона перехода не обещает (`ListItem.chevronIcon`): это
        # строка данных — «Топливный сбор · 6 500 ₽», — и нажимать её не на что
        if name == "ListItem" and "chevron={false}" in body:
            continue
        # Сердечко без пропа `liked` переключается само (`FavoriteButton`):
        # мёртвым его делает только управляемый режим без обработчика
        if name == "FavoriteButton" and "liked" not in body:
            continue
        # Поле без `readOnly` редактируется само: `defaultValue` — начальное
        # значение неуправляемого инпута, а не картинка. Мёртв только запертый
        if name == "Input" and "readOnly" not in body and "disabled" not in body:
            continue
        if any(prop in body for prop in live):
            continue
        line = src.count("\n", 0, m.start()) + 1
        snippet = " ".join((src[m.start() : end + 1]).split())[:100]
        found.append((line, name, snippet))
    return found


def main() -> int:
    # Консоль Windows в cp1251 роняет вывод на первой же звёздочке рейтинга
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    targets = sys.argv[1:] or ["app/src"]
    total = 0
    for target in targets:
        base = ROOT / target
        files = sorted(base.rglob("*.tsx")) if base.is_dir() else [base]
        for f in files:
            rel = f.relative_to(ROOT).as_posix()
            if SKIP.search(rel):
                continue
            hits = scan(f)
            if not hits:
                continue
            print(f"\n{rel}")
            for line, name, snippet in hits:
                print(f"  {line:>4}  {name:<18} {snippet}")
            total += len(hits)
    print(f"\nвсего мёртвых органов: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
