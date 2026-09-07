"""
Сканер органов кита, которые нажимаются молча.

Третий сканер оживления, и класс у него свой. `inert_controls.py` ищет орган
**без обработчика** — нажали, ничего не произошло. `painted_links.py` ищет
обещание, покрашенное цветом действия и никуда не ведущее. Здесь всё наоборот:
обработчик есть, переход происходит — **но нажатие не подтверждается**.

Дефект нашёл пользователь 05.08.2026: «карточки номеров при нажатии должны
реагировать — как большие». Карточка отеля приседает, карточка номера рядом с
ней — нет, хотя обе ведут на экран. Разница не читается как разница смысла;
она читается как «эта сломана».

**Правило, которое проверяется: нажимаемое отвечает на нажатие.** Отклик не
обязан быть масштабом — у строки во всю ширину он подложка, — но он обязан быть.

Как ищем. Компонент кита считается нажимаемым, если в его `.tsx` есть `<button`
или проп `onClick`/`onChange`/`onToggle`/`onSelect`. Молчащим — если в соседнем
`.module.css` нет ни одного правила `:active`.

Отсев (правила важнее самого поиска):

- **Орган-обвязка.** `Modal`, `Navbar`, `ErrorState`, `AIAdviceCard`, `ModuleBody`
  сами не нажимаются: они **носят** внутри себя `Button` или `IconButton`, и
  отклик приходит от них. Признак — обработчик пробрасывается наружу, а
  собственного корня-кнопки нет.
- **Поле ввода.** `Input`, `PromptField`, `Stepper` — у поля нажатие даёт фокус,
  и приседающее поле утащило бы за собой каретку. Отклик там кольцо, а не форма.
- **Витрина состояния.** `SegmentedControl`, `TabBar` — отклик даёт вложенный
  `TabItem`, у корня-контейнера нажатия нет.

Использование:
    python execution/mute_press.py
    python execution/mute_press.py app/src/components/RoomCard
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if not (ROOT / 'app' / 'src').is_dir():
    raise SystemExit(u'app/src не найден: прототип ещё не поставлен (навык react-base) — сканеру нечего смотреть.')


# Обвязки: обработчик проходит насквозь, отклик даёт вложенный орган кита.
CARRIERS = {
    'AIAdviceCard', 'AICard', 'ErrorState', 'Modal', 'ModuleBody', 'Navbar',
    'SegmentedControl', 'TabBar', 'Stepper', 'PromptField', 'Input', 'SheetHeaderBrand',
    # Корень не нажимается: `OrderCard` носит две `Button`, отклик даёт кнопка.
    # Карточка заказа целиком не нажимаемая намеренно — у неё два разных выхода
    # («Документы» и «Подробнее»), и общий тап пришлось бы выбирать за человека.
    'OrderCard',
    # Корень карточки экскурсии не нажимается: отклик даёт сердечко внутри неё.
    # Экрана экскурсии в продукте нет (№207 — тот же потолок фикстуры), и тап по
    # карточке вёл бы в никуда.
    'ExcursionCard',
}

CLICKABLE = re.compile(r'<button\b|\bonClick\b|\bonChange\b|\bonToggle\b|\bonSelect\b')


def scan(base: Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for tsx in sorted(base.rglob('*.tsx')):
        if tsx.name.endswith('.stories.tsx'):
            continue
        css = tsx.with_name(tsx.name.replace('.tsx', '.module.css'))
        if not css.exists():
            continue
        name = tsx.stem
        if name in CARRIERS:
            continue
        if not CLICKABLE.search(tsx.read_text(encoding='utf-8')):
            continue
        if ':active' in css.read_text(encoding='utf-8'):
            continue
        out.append((name, tsx.relative_to(ROOT).as_posix()))
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    targets = sys.argv[1:] or ['app/src/components']
    total = 0
    for target in targets:
        hits = scan(ROOT / target)
        for name, rel in hits:
            print(f'  {name:<20} {rel}')
        total += len(hits)
    print(f'\nвсего нажимаемых без отклика: {total}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
