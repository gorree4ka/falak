# -*- coding: utf-8 -*-
"""
Типографика чисел: разряды запятой, единица не отрывается от числа.

Один источник правила на все поверхности — Figma, React-база, каталог.
Правило и его происхождение — `ds/CONTRACT.md` п. 11; вопросы, из которых оно
выросло, — `ia/open-questions.md` №17 (разделитель) и №16 (типопара).

Что делает:

  1. **Разряды — запятой, а не пробелом.** «6 840» → «6,840».

     🔺 Прежняя редакция этого скрипта (из предыдущего проекта) делала прямо
     обратное: склеивала разряды неразрывным пробелом. Для пропорционального
     шрифта это верно, для нашего — нет. Все числа Falak набраны IBM Plex Mono,
     где пробел занимает полную ширину знака: «6 840» читается как два числа,
     «6» и «840». Поймано рендером компонента Orbit 05.09.2026, глазами —
     в вёрстке этого не видно, потому что там шрифт пропорциональный.

     Запятая при этом не компромисс, а норма формата для AED и en-AE.

  2. **Число и его единица склеиваются неразрывным пробелом:** «1,200 AED»,
     «19 يومًا», «12 %». Иначе единица остаётся в начале строки одна и не
     читается ничем.

  3. **Короткое число (1-2 цифры) и арабское слово за ним:** «19 يوم».
     Одинокая «19» в конце строки читается опечаткой, а не количеством.

Что НЕ трогается:

  · латиница вне списка единиц. «grid-cols-2 gap-4» в классах — не текст, и
    склейка там ломает вёрстку. Поэтому правило №3 работает только по арабскому:
    для латиницы риск задеть код выше пользы;
  · числа внутри путей SVG, токенов и числовых массивов — отсекаются проверкой
    `_COPY`: правило про типографику, а не про данные;
  · содержимое `ia/*.md`. Фикстура хранит значения уже в целевом формате,
    прогонять её незачем.

Использование:
    python execution/nbsp.py --check <файл|каталог>...   # только показать
    python execution/nbsp.py --apply <файл|каталог>...   # переписать
    python execution/nbsp.py --js                        # то же правило для Figma
    из другого скрипта:  from nbsp import fix, spots
"""
from __future__ import unicode_literals
import io
import os
import re
import sys

NBSP = ' '
COMMA = ','

# Единицы, которые нельзя оставлять в начале строки одни.
# Список закрытый: эвристика «короткое слово» на латинице ловит имена классов.
UNITS = [
    'AED', 'EGP', 'SAR', 'USD',
    'درهم', 'جنيه', 'ريال',
    'يوميًا', 'يومًا', 'يوم', 'أيام',
    'days', 'day',
    '%', '°',
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
# Длинные — вперёд, иначе «يوم» съест «يومًا».
UNITS.sort(key=len, reverse=True)

_ARABIC = '؀-ۿ'

# Разряды: пробел (обычный или неразрывный) между цифрой и ровно тремя цифрами.
# Заменяется на запятую — см. п. 1 шапки.
_GROUP_RE = re.compile(r'(?<=[0-9])[   ](?=[0-9]{3}(?![0-9]))')

# Число и единица: обычный пробел становится неразрывным.
# Хвостовой запрет отсекает совпадение с началом более длинного слова.
_UNIT_RE = re.compile(
    r'(?<=[0-9])[ ](?=(?:%s)(?![0-9A-Za-z%s]))'
    % ('|'.join(re.escape(u) for u in UNITS), _ARABIC),
    re.IGNORECASE  # «12 SEP» и «12 Sep» — один и тот же случай
)

# Короткое число и арабское слово за ним. Запрет `(?<![0-9]{3})` отсекает
# длинные числа: «1,240 عملية» рвать можно, «19» в конце строки — нет.
_COUNT_RE = re.compile(r'(?<![0-9]{3})(?<=[0-9])[ ](?=[%s])' % _ARABIC)


def fix(text):
    """Разряды — запятой, единица — на неразрывном пробеле."""
    if not text:
        return text
    prev = None
    out = text
    # Разряды применяем до сходимости: «12 000 000» — две замены подряд.
    while out != prev:
        prev = out
        out = _GROUP_RE.sub(COMMA, out)
    out = _UNIT_RE.sub(NBSP, out)
    return _COUNT_RE.sub(NBSP, out)


def spots(text):
    """Индексы позиций, где текст изменится. Длина текста правилом не меняется."""
    fixed = fix(text)
    if len(fixed) != len(text):
        return None
    return [i for i, (a, b) in enumerate(zip(text, fixed)) if a != b]


EXTS = ('.tsx', '.ts')

# Только человекочитаемый текст. Признак — арабская буква, валюта или число
# с разрядами. Отсекает пути SVG, значения токенов, классы Tailwind и числовые
# массивы: правило про типографику, а не про данные.
_COPY = re.compile(
    r'[%s]|\b(?:AED|EGP|SAR|USD)\b|(?<![.\d])\d{1,3}[   ]\d{3}(?![.\d])' % _ARABIC
)
# Строковые литералы и текст между тегами JSX.
_LITERAL = re.compile(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`]*`|(?<=>)[^<>{}\n]+(?=<)")

# 🔺 Путь SVG выглядит как текст с разрядами и проходит проверку `_COPY`:
# «M58.66 0.03C12 345 678» правило превращало в «…C12,345,678» и рвало логотип.
# Поймано тестом 05.09.2026. Отсекаем по форме: строка, начинающаяся с команды
# пути, текстом не является никогда.
_SVG_RE = re.compile(r'^[MmLlHhVvCcSsQqTtAaZz][\s\d.,+-]')

_QUOTES = '\'"`'


def fix_source(src):
    """Правило применяется только внутри литералов с текстом; код не трогаем."""
    def repl(m):
        s = m.group(0)
        if _SVG_RE.search(s.strip(_QUOTES).strip()):
            return s
        return fix(s) if _COPY.search(s) else s
    return _LITERAL.sub(repl, src)


def _walk(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
        else:
            for root, dirs, files in os.walk(p):
                dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'storybook-static', 'dist')]
                for f in files:
                    if f.endswith(EXTS):
                        yield os.path.join(root, f)


def as_js():
    """То же правило для Figma-скрипта. Генерируем, а не переписываем руками:
    две копии правила разъедутся."""
    units = '|'.join(re.escape(u) for u in UNITS)
    return (
        'const NBSP = String.fromCharCode(160), SP = String.fromCharCode(32);\n'
        'const GROUP = /(?<=[0-9])[ \\u00a0\\u202f](?=[0-9]{3}(?![0-9]))/g;\n'
        'const UNIT = new RegExp("(?<=[0-9])" + SP + "(?=(?:%s)(?![0-9A-Za-z\\\\u0600-\\\\u06ff]))", "g");\n'
        'const COUNT = /(?<![0-9]{3})(?<=[0-9])[ ](?=[\\u0600-\\u06ff])/g;\n'
        'function fixText(t) {\n'
        '  if (!t) return t;\n'
        '  let prev = null, out = t;\n'
        '  while (out !== prev) { prev = out; out = out.replace(GROUP, ","); }\n'
        '  out = out.replace(UNIT, NBSP);\n'
        '  return out.replace(COUNT, NBSP);\n'
        '}\n'
    ) % units.replace('\\', '\\\\')


def main(argv):
    # Консоль Windows в cp1251 роняет вывод на первом же арабском знаке —
    # прогон не должен падать из-за того, чем его читают.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(argv) >= 2 and argv[1] == '--js':
        io.open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False).write(as_js())
        return 0
    if len(argv) < 3 or argv[1] not in ('--check', '--apply'):
        sys.stdout.write(__doc__)
        return 2
    apply_ = argv[1] == '--apply'
    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False)
    touched = total = 0
    for path in _walk(argv[2:]):
        src = io.open(path, encoding='utf-8').read()
        dst = fix_source(src)
        if dst == src:
            continue
        n = sum(1 for a, b in zip(src, dst) if a != b)
        touched += 1
        total += n
        out.write('%s  замен: %d\n' % (path.replace('\\', '/'), n))
        if apply_:
            io.open(path, 'w', encoding='utf-8', newline='\n').write(dst)
    out.write('%s: файлов %d, замен %d\n' % ('переписано' if apply_ else 'нужно править', touched, total))
    out.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
