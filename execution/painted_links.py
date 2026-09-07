"""
Сканер обещаний, покрашенных в цвет действия и никуда не ведущих.

Зачем отдельно от `inert_controls.py`. Тот ищет **органы кита** без обработчика —
`Button`, `ListItem`, `IconButton`. Но самый живучий дефект оживления другой:
обычный `<span>`, покрашенный в `--text-action`. Он выглядит ссылкой, курсор над
ним обычный, и ни один разбор компонентов его не видит, потому что компонента там
нет — есть текст и цвет.

Три случая нашлись глазами и только после этого стали проверкой:

- «спросить» в непроверенном факте — полгода стояло в `text-action` и не
  нажималось (№260);
- «Точные даты» на матрице — половина двусторонней пары, обратная работала;
- «Смотреть туры» в колонке сравнения — с кольцом-обводкой, то есть прямо по
  правилу «кольцо значит "на это нажимают"» (№221).

**Правило, которое проверяется: цвет действия — обещание, и оно обязано вести.**
Либо элемент нажимается, либо он не покрашен.

Как ищем. В каждом `*.module.css` собираем классы, чьё правило красит текст в
`--text-action` либо ставит `cursor: pointer`. Затем в соседнем `.tsx` находим
`<span>`/`<div>` с этим классом и смотрим, есть ли у них `onClick`, `href`,
`role="button"` или `tabIndex`.

Отсев (правила важнее самого поиска):

- **`<Icon className={s.glyph}>` — не обещание, а марка.** Акцентный глиф в
  `AICard`, `InfoBanner`, `ExcursionTeaser` говорит «это про ИИ / про важное», а
  не «нажми». Поэтому ищем только текстовые контейнеры — `span` и `div`.
- **Элемент внутри собственной кнопки** (`TabItem`, `Button ghost`, `CopyAction`):
  красит подпись, а нажимается корень. Такие классы перечислены поимённо —
  автоматике различить их нечем, а список короткий и стабильный.
- **Пустой элемент ничего не обещает.** `<span className={s.blank} />` в клавиатуре
  — распорка, делящая класс с настоящей клавишей: текста в ней нет, значит нет и
  обещания. Проверяется по факту `/>` — самозакрывающийся тег без детей.
- **Класс состояния, а не действия.** `rowLabelOn` в матрице дат красит **текущую**
  строку: цвет там говорит «вы здесь», а не «нажмите». Признак — имя,
  оканчивающееся на `On`, и парный класс без суффикса в том же файле.

Использование:
    python execution/painted_links.py
    python execution/painted_links.py app/src/screens/Compare
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if not (ROOT / 'app' / 'src').is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')


# Классы, крашеные внутри собственного корня-кнопки: нажимается корень, а не подпись.
# Держится списком, потому что вложенность автоматике здесь не видна.
INSIDE_OWN_BUTTON = {
    'components/TabBar/TabBar.module.css': {'on'},
    'components/TabItem/TabItem.module.css': {'on'},
    'components/Button/Button.module.css': {'ghost'},
    'components/CopyAction/CopyAction.module.css': {'root'},
    'components/VerifyLink/VerifyLink.module.css': {'root'},
    'components/PromptField/PromptField.module.css': {'field', 'send'},
}

LIVE = ('onClick', 'href', 'role="button"', 'tabIndex', '...rest', '...props')

CLASS_RULE = re.compile(r'\.([A-Za-z][\w-]*)\s*(?:,\s*\.[\w.:()-]+\s*)*\{([^}]*)\}', re.S)
PAINTED = re.compile(r'color:\s*var\(--text-action\)|cursor:\s*pointer')


def painted_classes(css: Path) -> set[str]:
    """Классы, которые красят текст действием или обещают курсором."""
    out: set[str] = set()
    src = css.read_text(encoding='utf-8')
    for m in CLASS_RULE.finditer(src):
        if PAINTED.search(m.group(2)):
            out.add(m.group(1))
    return out


def attrs_of(src: str, start: int) -> tuple[str, int]:
    """Дочитывает открывающий тег до `>` через вложенные скобки и строки."""
    i, depth, quote = start, 0, ''
    while i < len(src):
        ch = src[i]
        if quote:
            if ch == quote:
                quote = ''
        elif ch in '"\'`':
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        elif ch == '>' and depth == 0:
            return src[start:i], i
        i += 1
    return src[start:], len(src)


def scan(tsx: Path, classes: set[str]) -> list[tuple[int, str, str]]:
    src = tsx.read_text(encoding='utf-8')
    found: list[tuple[int, str, str]] = []
    for m in re.finditer(r'<(span|div)\b', src):
        body, end = attrs_of(src, m.end())
        used = {c for c in classes if re.search(r'\bs\.' + re.escape(c) + r'\b', body)}
        # Класс состояния — не обещание: `rowLabelOn` красит текущую строку,
        # и цвет там говорит «вы здесь», а не «нажмите»
        used = {c for c in used if not (c.endswith('On') and c[:-2] in classes | {c[:-2]})}
        if not used:
            continue
        if any(p in body for p in LIVE):
            continue
        # Пустой элемент ничего не обещает: распорка делит класс с настоящей клавишей
        if body.rstrip().endswith('/'):
            continue
        line = src.count('\n', 0, m.start()) + 1
        snippet = ' '.join(src[m.start():end + 1].split())[:110]
        found.append((line, ', '.join(sorted(used)), snippet))
    return found


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    targets = sys.argv[1:] or ['app/src']
    total = 0
    for target in targets:
        base = ROOT / target
        for css in sorted(base.rglob('*.module.css')):
            rel_css = css.relative_to(ROOT / 'app' / 'src').as_posix()
            classes = painted_classes(css) - INSIDE_OWN_BUTTON.get(rel_css, set())
            if not classes:
                continue
            tsx = css.with_name(css.name.replace('.module.css', '.tsx'))
            if not tsx.exists():
                continue
            hits = scan(tsx, classes)
            if not hits:
                continue
            print(f'\n{tsx.relative_to(ROOT).as_posix()}')
            for line, cls, snippet in hits:
                print(f'  {line:>4}  {cls:<16} {snippet}')
            total += len(hits)
    print(f'\nвсего покрашенных обещаний без пути: {total}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
