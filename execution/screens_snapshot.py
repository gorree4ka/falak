# -*- coding: utf-8 -*-
u"""Снимок всех кадров прототипа в PNG — точка «как было» / «как стало» для кейса.

Зачем скрипт, а не руки: кадров со состояниями **164**, и снимать их по одному
через браузер — это день работы и гарантированный пропуск. А снимок нужен ровно
в один момент — **до** правки; переснять «как было» после неё уже нечем.

Кадр адресуется галереей: `/#/screen/<id>/<состояние>` — тот самый адрес, ради
которого галерея и живёт. Перечень берётся из реестра, а не из папки: у `dates`
папка `DatesMatrix`, и любое правило «по имени каталога» теряет экраны молча.

Снимается **собранная версия** (`vite preview`), а не дев-сервер: у дева свои
оверлеи ошибок и HMR-скрипт, которые попадают в кадр.

Трекер на localhost молчит сам (`app/public/track.js`, правка 3), так что прогон
не пишется в юзер-тесты. Проверено 10.08.2026 — тем же вечером, когда headless
по живому адресу нагадил в раунд.

    python execution/screens_snapshot.py before-2026-08-10
    python execution/screens_snapshot.py after-состав --only checkout,tour,payment
"""
import io
import os
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from project import ROOT_STR as ROOT
CHROME = os.environ['LOCALAPPDATA'] + r'\Google\Chrome\Application\chrome.exe'
PORT = 4199
BASE = 'http://localhost:%d/#/screen/' % PORT

label = sys.argv[1] if len(sys.argv) > 1 else 'snapshot'
only = None
if '--only' in sys.argv:
    only = set(sys.argv[sys.argv.index('--only') + 1].split(','))

OUT = ROOT + 'assets/case/' + label + '/'
if not os.path.isdir(OUT):
    os.makedirs(OUT)

# ── перечень кадров ──────────────────────────────────────
src = io.open(ROOT + 'app/src/screens/registry.ts', encoding='utf-8').read()
blocks = re.findall(
    r"\n    id: '([a-z0-9-]+)',\s*\n    name: '([^']+)'([\s\S]{0,700}?)(?=\n    id: '|\Z)", src)
# Порог — «реестр вообще прочитался», а не число из другого проекта: экранов здесь пока два.
assert len(blocks) >= 1, len(blocks)

frames = []
for sid, name, body in blocks:
    if only and sid not in only:
        continue
    frames.append((sid, 'default', name))
    for st in re.findall(r"\{ id: '([A-Za-z0-9]+)', label:", body):
        frames.append((sid, st, name))

print('кадров к съёмке:', len(frames))

# ── собранная версия под предпросмотром ──────────────────
prev = subprocess.Popen(
    ['npx', 'vite', 'preview', '--port', str(PORT)],
    cwd=ROOT + 'app', shell=True,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)

made, failed = 0, []
try:
    for sid, state, _name in frames:
        path = OUT + sid + '__' + state + '.png'
        url = BASE + sid + '/' + state
        try:
            subprocess.run(
                [CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                 # Окно должно вместить **самое высокое устройство целиком**:
                 # 430×932 (Pro Max) плюс шапка галереи. Меньше — и кадр уезжает
                 # за нижнюю кромку снимка, причём молча: файл получается целым.
                 '--force-device-scale-factor=2', '--window-size=560,1320',
                 # Кадр монтируется React-ом: без бюджета времени снимок уходит пустым.
                 '--virtual-time-budget=6000', '--screenshot=' + path, url],
                capture_output=True, timeout=90)
        except Exception as e:
            failed.append((sid, state, str(e)[:40]))
            continue
        if os.path.exists(path) and os.path.getsize(path) > 8000:
            made += 1
        else:
            failed.append((sid, state, 'пустой файл'))
finally:
    prev.terminate()

print('снято:', made, 'из', len(frames), '· папка:', OUT)
if failed:
    print('не вышло:', len(failed))
    for f in failed[:12]:
        print('  ', f[0], '/', f[1], '->', f[2])
