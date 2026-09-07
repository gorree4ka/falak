# -*- coding: utf-8 -*-
u"""Сборка `dashboard/app/config.js` из реестра экранов прототипа.

Карта экранов не набирается руками: она обязана совпадать со слагами, которые
шлёт мост в `Prototype.tsx` (`'/' + id` из реестра). Разошлись бы — дашборд
показывал бы слаги вместо имён и молча.

Аргумент — адрес сбора (endpoint). Без него пишется пустая строка, и дашборд
честно скажет «не подключён».
"""
import io
import json
import os
import re
import sys

from project import ROOT_STR as ROOT, PROTOTYPE
ENDPOINT = sys.argv[1] if len(sys.argv) > 1 else ''
# PROTOTYPE берётся из project.json

src = io.open(ROOT + 'app/src/screens/registry.ts', encoding='utf-8').read()
screens = re.findall(r"\n    id: '([a-z0-9-]+)',\s*\n    name: '([^']+)'", src)
assert len(screens) >= 40, len(screens)

# Какие экраны — шторки. Нужно анализу: разворот «экран → шторка → экран» это
# норма (шторка затем и открывается, чтобы закрыться), а до 10.08.2026 он
# считался блужданием и завышал трение самой шторке (`ia/open-questions.md` №382).
#
# Признак берётся из **того, чем экран собран** — `SheetShell`, — а не из
# необязательного поля `overlay` в реестре: оно проставлено у четырёх экранов
# из пятнадцати, потому что нужно только для модалок.
SCREENS_DIR = ROOT + 'app/src/screens/'

# Путь к файлу экрана выводится **из импорта в реестре**, а не из имени папки по
# идентификатору: у `dates` папка `DatesMatrix`, и наивное правило «id → Папка»
# теряло ровно её — самую посещаемую шторку воронки.
imports = dict(re.findall(r"import \{ (\w+) \} from '\./([\w/]+)'", src))
components = dict(re.findall(
    r"\n    id: '([a-z0-9-]+)',[\s\S]{0,400}?\n    component: (\w+)", src))

sheets = []
for _sid, _name in screens:
    comp = components.get(_sid)
    rel = imports.get(comp) if comp else None
    if not rel:
        continue
    path = SCREENS_DIR + rel + '.tsx'
    if os.path.exists(path) and 'SheetShell' in io.open(path, encoding='utf-8').read():
        sheets.append('/' + _sid)

FLOWS = [
    {
        'id': 'booking',
        'name': u'Найти тур и забронировать',
        'funnel': ['/home', '/search-progress', '/results', '/hotel', '/hotel-tours',
                   '/tour', '/auth-phone', '/auth-code', '/checkout', '/payment', '/success'],
        'goal': '/success',
        'firstClick': {'screen': '/home', 'target': u'home: найти туры'},
    },
    {
        'id': 'children',
        'name': u'Посчитать поездку с ребёнком',
        'funnel': ['/home', '/tourists-picker', '/search-progress', '/results',
                   '/hotel', '/hotel-tours', '/tour'],
        'goal': '/tour',
        'firstClick': {'screen': '/home', 'target': u'home: кто едет'},
    },
    {
        'id': 'compare',
        'name': u'Сравнить кандидатов перед решением',
        'funnel': ['/home', '/search-progress', '/results', '/favorites', '/compare'],
        'goal': '/compare',
    },
    {
        'id': 'hot-tour',
        'name': u'Взять горящий тур с главной',
        # 🔺 Воронка укоротилась 11.08.2026 вместе с маршрутом (№389): карточка
        # горящего тура вела на экран отеля, потому что тура за 148 000 не было
        # в фикстуре. Теперь она ведёт на свой тур, и промежуточных экранов на
        # этом пути нет. Проходы до 11.08 с новыми несравнимы — граница раунда.
        'funnel': ['/home', '/tour'],
        'goal': '/tour',
    },
]

HEAD = u'''// Конфиг дашборда юзер-тестов. Собран директивой `directive_dashboard`
// скриптом `execution/dashboard_config.py` из реестра экранов прототипа —
// руками не правится: карта экранов обязана совпадать со слагами, которые
// шлёт мост в `app/src/app/Prototype.tsx` (`'/' + id` из реестра).
//
// Сценарии и пороги гипотез выведены из PRD (цели O1–O3) и из того, что
// прототип действительно умеет; разбор — `ia/user-testing.md`.
window.DASHBOARD_CONFIG = '''

cfg = {
    'endpoint': ENDPOINT,
    'prototypeUrl': PROTOTYPE,
    'screens': dict(('/' + sid, name) for sid, name in screens),
    'sheets': sheets,
    'flows': FLOWS,
    'key': '',
}

body = json.dumps(cfg, ensure_ascii=False, indent=2)
io.open(ROOT + 'dashboard/app/config.js', 'w', encoding='utf-8').write(HEAD + body + u';\n')
print('экранов в карте:', len(screens), '· шторок:', len(sheets), '· сценариев:', len(FLOWS), '· endpoint:', ENDPOINT or u'(пусто)')
